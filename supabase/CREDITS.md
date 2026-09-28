# Créditos de geração — entrega de 19/09/2026

## Arquitetura e regras

O React continua chamando `generate-itinerary`. A função verifica o token com
`auth.getUser` antes de chamar RPCs administrativas ou o webhook existente. O n8n,
seu prompt, as bases turísticas e a ordem dos locais não foram alterados.

- `generation_wallets`: uma carteira por usuário, saldo não negativo e concessão inicial de 3.
- `generation_requests`: chave `(user_id, id)`, hash dos parâmetros, estado, prazo e resultado confirmado.
- O saldo não depende de salvar, excluir ou publicar roteiros. Todo roteiro gerado com sucesso custa 1 crédito.
- Um trigger em `auth.users` concede os 3 créditos a novos usuários. O backfill usa `ON CONFLICT DO NOTHING` para usuários existentes: executar novamente a concessão não restaura créditos gastos.
- As migrações usam o histórico de versões; não é necessário executar manualmente o mesmo DDL duas vezes.

`reserve_generation_credit` bloqueia a linha da carteira com `FOR UPDATE`, recupera
reservas expiradas, verifica saldo e limite de tentativas e reserva 1 crédito.
Um índice único parcial permite somente uma reserva ativa por usuário. Todas as
transições usam a mesma ordem de locks, inclusive devolução e confirmação.

A Edge Function valida a estrutura completa com o mesmo normalizador do frontend.
Para **novas gerações**, dia vazio, local sem nome, ordem inválida, quantidade de
dias incorreta e resposta excessiva são falhas. O leitor de roteiros salvos
continua aceitando os dias vazios antigos. Nenhum registro salvo foi reescrito.

`finish_generation_credit` confirma o consumo junto com o armazenamento do
resultado, em uma única transação. Em falhas anteriores à confirmação, devolve o
crédito uma única vez. Uma reserva abandonada expira após 120 segundos e é
restituída na próxima consulta de saldo, reserva ou finalização. O frontend
consulta a cada 30 segundos e ao recuperar foco; não há dependência de cron.

O webhook mantém timeout de 60 segundos e não recebe retries automáticos. Há um
limite de 10 novas tentativas por usuário em uma janela de uma hora, incluindo
falhas. Consultar novamente a mesma tentativa não gasta crédito nem chama a IA.

Se a conexão cair durante a confirmação, o servidor não faz uma devolução cega:
a mesma chave recupera o resultado confirmado ou a reserva expira. O navegador
guarda a chave e as preferências por usuário e tentativa antes de enviar. Abas
distintas não apagam a tentativa umas das outras. “Parar de aguardar” interrompe
a espera no navegador; não promete cancelar trabalho já recebido pelo n8n.

## Segurança e expansão futura

As duas tabelas têm RLS. O usuário pode ler apenas sua carteira, sem INSERT,
UPDATE ou DELETE. Não pode ler diretamente registros internos de geração nem
executar reserva/finalização/devolução. Somente `service_role` executa as RPCs
administrativas; `generation_credit_summary` deriva o usuário de `auth.uid()`.
Funções privilegiadas têm `search_path` vazio e permissões explícitas.

O gateway da Edge Function usa `verify_jwt = false` porque a validação real é feita
por `auth.getUser(token)` dentro da função, antes de qualquer consumo ou chamada
de IA. Chamadas sem sessão foram testadas e retornam 401. Nenhuma chave administrativa
é enviada ao frontend.

Erros exibidos na geração vêm de mensagens fixas associadas a códigos conhecidos.
Respostas SQL, n8n e detalhes internos não são exibidos. O fluxo verifica sessões
ao recuperar foco e encerra a sessão local após rejeição de autenticação.

Pacotes mostrados: 1 geração por R$ 10; 3 por R$ 25. A compra está marcada como
futura, sem botão que simule pagamento. Uma futura integração deve creditar a
carteira exclusivamente no backend e deduplicar o evento de pagamento. Não há
gateway, assinatura ou renovação mensal neste bloco.

## UX e scrollbar

- Formulário e cabeçalho mostram créditos. O formulário explica a concessão gratuita e os pacotes futuros.
- Saldo zero desabilita somente novas gerações. Recuperação de uma tentativa anterior continua disponível.
- Meus roteiros mostra paginação apenas se `page > 0 || hasMore`, no fluxo do conteúdo.
- Dias usam `details/summary`: recolhidos inicialmente, com número de atrações e seus nomes visíveis. Podem ser abertos independentemente.
- O botão “Ver mapa” aparece no início do resultado. Selecionar uma atração continua levando ao mapa, com respeito a movimento reduzido.
- Recuperação de senha usa a rota existente `/auth`, com `mode=forgot` e `mode=reset`, validação, confirmação e proteção contra duplo envio.

Auditoria estática do layout encontrou o loading chamado “compacto” com
`min-h-dvh`, inserido em páginas que já têm cabeçalho, margens e título. Esse
estado cria overflow que desaparece ao exibir listas curtas. A alternância entre
formulário, loading, resultado e dias expandidos também cruza naturalmente o
limite de altura da viewport. O loading compacto agora usa uma altura local.

O único dropdown de conta já estava com `modal={false}`; não há dialogs/popovers
Radix em uso nem mutações de overflow de `html/body` no código da aplicação.
O mapa usa controles próprios; o botão com ícone Expand ajusta o enquadramento,
não ativa fullscreen. O CSS fullscreen da biblioteca não comprova uso desse modo.

Foi acrescentado `scrollbar-gutter: stable` na raiz para reservar o espaço nativo
da scrollbar nas mudanças legítimas de altura. Não foi forçado `overflow-y:
scroll`, nem sobrescrita a compensação de RemoveScroll. Esse é o comportamento
documentado do [scrollbar-gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter).
**Não houve validação visual:** a sessão não disponibilizou navegador. A causa
apontada é sustentada pela inspeção do código, sem medição de pixels em execução.

## Publicação e verificações

A migration `20260919000100_generation_credits.sql` foi aplicada no projeto
vinculado e registrada no histórico. `generate-itinerary` foi publicada via API,
com `deno.json`, lock de dependências e normalizador compartilhado em `_shared`.

Comandos e resultados:

- `npm run typecheck`: passou.
- `npm run lint`: passou sem avisos após a correção do hook.
- `npm test`: 40 testes passaram, incluindo persistência de tentativas e isolamento entre abas/contas.
- `npm run test:edge`: 10 cenários passaram; rede/IA simuladas. Inclui autenticação, saldo zero, concorrência, sucesso, replay, timeout, dados insuficientes, tamanho de resposta e confirmação incerta.
- `powershell -File supabase/tests/run-credits.ps1 -Mode verify`: migration e testes executados antes da aplicação, em transação revertida.
- `generation_credits.sql`: concessão inicial, backfill idempotente, consumo único, devolução, expiração, replay, zero, RLS/permissões e limite de tentativas.
- `credits-concurrency.ps1`: duas transações reais independentes disputaram o último crédito; uma recebeu `acquired`, outra `busy`, saldo final 0 e uma reserva. Fixture removida.
- `auth-and-edge-smoke.mjs`: conta real descartável; token de recuperação, atualização de senha, login, 3 créditos iniciais, tentativa de alterar saldo negada, chamadas diretas à Edge com 401/402, leitura de roteiros com saldo zero e saldo preservado após novo login. Conta removida; nenhuma chamada à IA nem envio de e-mail.
- `itineraries_rls.sql`, `community_rls.sql`, `partners_rls.sql`: passaram no Supabase, com rollback das fixtures.
- `npm run build`: passou; avisos de tamanho do bundle MapLibre e base Browserslist antiga permanecem.

O CLI tenta criar desnecessariamente um login temporário antes de `db query
--linked`, e o projeto rejeita essa criação. Os scripts usam a API de gerenciamento
com `SUPABASE_DB_PASSWORD=unused-api-only` somente no processo, evitando essa etapa.
Esse texto não é senha e não é usado para abrir uma conexão PostgreSQL direta.
Nenhuma permissão de banco foi modificada para contornar o problema.

## O que resta operacionalmente

1. Publicar o frontend atualizado pelo processo de hospedagem do projeto. A Edge já exige o identificador enviado pelo novo frontend; uma versão antiga do formulário deve ser atualizada junto deste bloco.
2. Conferir o fluxo visual em desktop/mobile e o comportamento da scrollbar no navegador de uso real.
3. Validar a entrega de um e-mail de recuperação na caixa de entrada. O teste real cobriu token, senha e login, sem envio de e-mail. O redirect local foi preservado pelo Supabase; a URL de produção `/auth?mode=reset` deve estar permitida na [configuração de redirects](https://supabase.com/docs/guides/auth/redirect-urls).

Nenhuma decisão comercial ou gateway é necessária agora. Alterações locais
preexistentes de mapa/rotas foram preservadas.
