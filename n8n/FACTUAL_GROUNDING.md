# Fidelidade factual por construção — TCC v0.1

## Estado e recomendação

Implementado e testado apenas no rascunho `c752fe8d-ca95-4685-b3cd-993826ab656f`. **Não publicado.** A versão ativa continua `42de097c-1573-41a0-b5c6-1af5d99b03e1`.

A fidelidade dos textos aos candidatos ficou adequada nos três casos: nenhuma afirmação sem apoio foi encontrada nas 30 descrições revisadas. O mecanismo também impede que prosa inventada pelo modelo entre no título, resumo, descrição, nome, coordenadas ou duração. A latência permaneceu abaixo de 4,2 segundos nas três execuções.

**Ainda não recomendo publicação geral.** A revisão identificou planejamento fraco no caso de 3 dias (locais muito distantes dentro do mesmo dia) e repetiu uma ressalva de horários no caso de 5 dias. Esses problemas afetam a qualidade do roteiro mesmo quando seus textos são factuais. A mudança de fidelidade está pronta para revisão; a aprovação global do gerador precisa resolver ou aceitar explicitamente essas limitações. Não foram alterados mapas, OSRM, otimização de trajetos ou dados das bases para escondê-las.

## Arquitetura e fronteira de responsabilidade

Fluxo preservado: região determinística → Sheets → compactação/deduplicação/pré-seleção → uma chamada Gemini → hidratação determinística → validador original → resposta.

Antes, a IA retornava IDs e também `titulo`, `descricao_geral`, `descricao_curta` e duração em texto. A hidratação só recuperava nome/coordenadas. Havia vários campos pelos quais fatos inventados chegavam ao usuário.

Agora, o contrato interno é:

```json
{"dias":[{"dia":1,"locais":[{"id":"p1","periodo":"manha","duracao_minutos":90}]}]}
```

- O modelo seleciona atrações, distribui dias/períodos e estima permanência.
- A ordem dos arrays continua definindo a sequência global, sem reordenação posterior.
- Nomes, coordenadas, título, resumo, descrições e justificativas retornados indevidamente pelo modelo são ignorados. IDs desconhecidos/repetidos são rejeitados.
- Não se acrescentou motivo livre de escolha: seria outro canal de afirmações não verificadas. A personalização permanece na seleção, dias, períodos e duração, orientada por interesses e texto livre completo.
- `duracao_minutos` precisa ser inteiro de 1 a 1440. É formatado deterministicamente para o campo público `duracao_estimada`, por exemplo `90` → `1h30`. Strings com fatos/serviços são rejeitadas. O limite representa permanência dentro de um dia, não garante que a programação diária total seja viável.

### Fatos dos locais

Cada ID selecionado é associado ao candidato original normalizado. Nome e coordenadas públicos vêm exclusivamente desse registro. A hidratação também recupera regiões de origem, types, endereço, rating, quantidade de avaliações, atributos, horários, preço e status em `factualAudit`.

`factualAudit` permanece nos dados internos do node, junto ao `output`. O validador original retorna apenas o contrato público. Não se acrescentaram campos não usados pelo frontend nem se alterou a integração. Os fatos já estavam no catálogo; o registro de auditoria permite rastrear cada frase aos campos utilizados, sem chamar outro modelo.

Os logs de console continuam restritos a requestId, contagens e tempos. A evidência factual detalhada fica sujeita à retenção normal de execuções n8n, assim como os dados de candidatos já existentes.

### Descrições

Nas duas bases consultadas nos testes não há coluna de descrição editorial. Há fatos estruturados. A descrição usa:

1. Uma frase de uma lista explícita de traduções amplas de categorias presentes em `types`: praia, museu, área de trilha, restaurante etc. Não infere categoria pelo nome.
2. Até dois atributos estritamente `true`, apresentados como informação do cadastro. Ausentes, falsos ou contraditórios não viram afirmações positivas.
3. Rating entre 1 e 5 e quantidade positiva inteira de avaliações, quando disponíveis, identificados como avaliação registrada.
4. Sem fatos reconhecidos, o texto neutro “Parada para conhecer este local.”

Não se deduzem rapel, tirolesa, degustação, infraestrutura, tranquilidade, proximidade de bares, dificuldade ou segurança de uma trilha. Endereços, horários e preços não são transformados em promessas de acesso ou disponibilidade. Não se criou texto editorial novo para preencher lacunas.

O texto é curto e consistente, mas tem menos variedade narrativa. Locais cuja categoria é apenas `tourist_attraction` recebem descrição genérica mesmo que seu nome sugira praia ou mirante. Isso é uma consequência deliberada da fonte limitada. O cadastro pode estar errado ou desatualizado: fidelidade ao registro não certifica a situação real do local.

### Título e resumo

Gerados com quantidade de dias, regiões solicitadas, interesses informados, contagem real de paradas e dias vazios. O resumo não afirma atendimento completo às preferências nem inventa explicação para um dia sem locais. Texto livre chega integralmente ao modelo; não é republicado como fato sobre destinos. Os limites atuais de tamanho são preservados.

## Verificação antes das execuções

- 23 testes locais passaram, incluindo ataques simulados com nomes/coordenadas/textos inventados, duração contendo serviços, desconhecimento de categorias, atributos conflitantes, texto livre preservado, fallback neutro e rastreabilidade de fatos.
- Testes anteriores de deduplicação, diversidade, fallback de candidatos, ordem global, dias vazios e rejeição de vazio total continuam passando.
- `npm run typecheck` e `npm run lint`: passaram.
- MCP: Code nodes e Chain válidos; workflow completo de dez nodes válido. Na checagem isolada da Chain foi necessário informar a referência completa ao subnode do modelo; isso não exigiu mudança na arquitetura.

## Comparação controlada

Somente três novas execuções administrativas (#31–33), sequenciais, sem retry, sem Edge e sem créditos de usuários. Nenhuma execução adicional após a revisão. Mesmo Gemini `google/gemini-3.1-flash-lite`, temperatura 0.2, teto 8192, JSON mode e orçamento de 55 s; configurações do modelo não foram alteradas.

Casos idênticos ao benchmark anterior:

1. 2 dias, Grande Florianópolis, praias/esportes, texto vazio.
2. 3 dias, Vale Europeu, praias, texto “gosto de praias tranquilas e com acesso a bares por perto”.
3. 5 dias, Vale Europeu + Grande Florianópolis, praias/esportes/montanhas/gastronomia, texto vazio.

Os catálogos e contextos enviados foram **idênticos aos anteriores**, verificados por igualdade de catálogo e SHA-256 de contexto. Apenas o prompt/contrato de saída e a hidratação mudaram. Candidatos: 32 / 77 / 76. O caso de 3 dias mantém o fallback de baixa confiança. Uma chamada de modelo em cada execução.

| Caso | Total antes → depois | Modelo antes → depois | Entrada antes → depois | Saída antes → depois | Estrutura final |
|---|---|---|---|---|---|
| 2 dias (#23 → #31) | 3,821 → 4,192 s | 3,182 → 2,671 s | 5.589 → 4.946 | 557 → 146 | 2 dias, 6 locais, válida |
| 3 dias (#25 → #32) | 4,910 → 3,435 s | 4,282 → 2,765 s | 15.253 → 14.610 | 778 → 430 | 3 dias, 9 locais, válida |
| 5 dias (#30 → #33) | 8,653 → 3,407 s | 5,708 → 2,703 s | 13.058 → 12.415 | 1.209 → 366 | 5 dias, 15 locais, válida |

O baseline #23 teve falha no adaptador de JSON, corrigida e validada offline na rodada anterior; seu total não representa sucesso ponta a ponta original. Os três casos novos passaram ao vivo pelo responder de sucesso e depois pelo schema real do frontend em replay offline.

A pequena subida do total de 2 dias acompanha Sheets (461 → 1288 ms); o modelo ficou mais rápido. Não houve trabalho adicional de otimização de velocidade. A redução de saída resulta de remover prosa da responsabilidade do modelo. Não se infere SLA/p95 de três casos; roteamento/fila do provedor podem variar.

### Tempos dos nodes nesta rodada

| Etapa | #31 | #32 | #33 |
|---|---:|---:|---:|
| Selecionar bases | 46 ms | 32 ms | 14 ms |
| Sheets | 1288 ms | 348 ms | 357 ms |
| Preparar candidatos | 103 ms | 74 ms | 141 ms |
| Modelo | 2671 ms | 2765 ms | 2703 ms |
| Hidratar fatos/textos | 26 ms | 46 ms | 46 ms |
| Validador original | 13 ms | 59 ms | 65 ms |
| Respond to Webhook | 1 ms | 1 ms | 3 ms |

A Chain inclui o subnode do modelo, por isso não se somam ambos. Total inclui overhead do motor.

## Revisão factual explícita

Foram revisadas as **30 descrições, os três títulos e os três resumos** contra o pedido e os candidatos. O verificador também confronta nomes/coordenadas, fatos recuperados e cada referência de evidência, executa o validador original e o schema do frontend. Nenhuma afirmação sem apoio foi encontrada nesses textos. As escolhas e estimativas do modelo são avaliadas separadamente abaixo.

| Problema anterior | Comportamento após a mudança |
|---|---|
| “boa infraestrutura” no resumo | O resumo agora contém apenas informações verificáveis sobre pedido e resultado; não caracteriza infraestrutura. |
| Suposição de que não existem praias na base Vale Europeu | Não há campo livre para essa afirmação. O novo caso de 3 dias selecionou Praia do Centro e Praia da Solidão. Não se promete tranquilidade ou bares próximos. |
| Catedral descrita como atrativo arquitetônico | No replay com os mesmos IDs antigos: “Visita à igreja. Avaliação registrada: 4,8/5 (5065 avaliações).” Categoria `church`, rating e contagem constam na fonte. |
| Paraíso das Ostras com “produtos locais” | No replay com a seleção antiga: “Visita à fazenda. Avaliação registrada: 4,9/5 (108 avaliações).” Fonte `farm`; sem alegação sobre origem dos produtos. |
| Centro de aventura enriquecido com modalidades específicas | Nova resposta #33: “Visita ao centro de esportes de aventura. Avaliação registrada: 4,9/5 (271 avaliações).” Sem rapel ou tirolesa. |
| Nome sugere mirante, mas só há categoria genérica | Mirante Praia Mole usa “Visita ao atrativo turístico cadastrado.” Não promete vista/panorama com base somente no nome. |

Para isolar a fidelidade textual da mudança de seleção, também reapliquei a nova hidratação às **seleções antigas salvas**, convertendo as durações antigas em minutos apenas no script offline. Esse replay não chamou IA nem alterou o workflow. Os pares completos antes/depois estão em `factual-benchmark-results.json`, em `assemblyComparisonSameSelection`.

### Qualidade das descrições

As descrições ficaram mais curtas e menos editoriais. Atributos e avaliações dão informação concreta quando disponíveis; não repetem uma justificativa inventada. Alguns textos se parecem porque a base não diferencia bem os locais. Não foi adicionada variedade artificial de frases como substituto de conteúdo factual.

Exemplo real: “Parada no restaurante. Música ao vivo informada no cadastro. O cadastro informa que aceita cães. Avaliação registrada: 4,9/5 (4909 avaliações).” Os dois atributos são `true` no registro de Biergarten Pomerânia. Isso não promete apresentação musical em um horário específico.

### Qualidade do planejamento: ressalvas materiais

- **2 dias:** seis visitas em dois grupos próximos; somas dos segmentos em linha reta de 1,7 e 1,4 km dentro dos dias. A permanência estimada total é de 7 e 8 horas, sem garantia de viabilidade física individual.
- **3 dias:** aderência nominal a praias melhorou, mas a IA alternou litoral e Blumenau no mesmo dia. O terceiro dia combina Dunas do Santinho e restaurantes de Blumenau, acumulando cerca de **94,7 km em segmentos retos**, além de 7h30 de visitas. Outros dias somam 51,2 e 46,5 km. É evidência de agrupamento fraco para o pedido de bares por perto. Não é distância rodoviária ou cálculo de tempo de viagem. A base Vale Europeu já contém endereços de outras regiões; foi mantido o mapeamento vigente, sem nova regra geográfica.
- **5 dias:** quinze visitas e ambas as bases representadas. Persiste Norden Blumenau pela manhã, enquanto o cadastro abre predominantemente às 17h nos dias úteis e às 11h no fim de semana. Sem data, não se declara impossibilidade absoluta, mas o período é pouco confiável. O quarto dia mantém cerca de 50,5 km retos entre visitas, exigindo revisão da distribuição.

Não se corrigiu isso com reordenação silenciosa, eliminação de locais ou nova chamada de modelo. Esses passos mudariam a avaliação do planejamento e merecem uma intervenção delimitada, sem ampliar esta rodada de fidelidade.

## Preservação e próximos passos

Comparação final com o início da rodada: grafo publicado e conexões iguais; Webhook/Header Auth, Sheets, modelo/configurações, Code node de validação e responders idênticos. Somente quatro nodes do rascunho receberam atualização de parâmetros:

- `Selecionar bases` e `Preparar candidatos`: recebem a cópia atualizada do módulo compartilhado; funções de seleção e contextos mantidos.
- `Montar roteiro`: novo contrato de planejamento sem prosa.
- `Recuperar locais reais`: geração determinística de textos e evidência factual interna.

Próximo passo recomendado antes de publicar: uma correção pontual de coerência geográfica/horários ou decisão explícita sobre essas limitações. Não é necessário trocar modelo, otimizar latência, migrar Sheets, alterar créditos ou abrir outra rodada ampla de benchmark. Nenhuma publicação foi realizada ou agendada.

## Arquivos e reprodução

Fontes: `pipeline.mjs`, `pipeline.test.mjs`, `system-prompt.txt`, `build-workflow.mjs`, `model-config.json`, `README.md`.

Gerados: `workflow.sdk.js`, `update-operations.json`, `tcc-v0.1.draft.json`.

Evidências novas: `factual-benchmark-evidence.json`, `factual-benchmark-results.json`, `factual-benchmark-prompt.txt`, `factual-benchmark-integrity.json`, `verify-factual-benchmark.mjs`, este relatório.

Preservação histórica: `model-benchmark-pipeline.mjs` congela o código da comparação anterior; `analyze-model-benchmark.mjs` passa a usar essa cópia, evitando reescrever resultados antigos com o contrato novo.

Comandos offline:

```sh
node --test n8n/pipeline.test.mjs
node --experimental-strip-types n8n/verify-factual-benchmark.mjs
node n8n/build-workflow.mjs
```

O verificador passou nos três casos, 30 locais, um modelo por execução e contextos iguais. `typecheck` e `lint` passaram. Build e suítes de app/Edge não foram repetidos: essas áreas não mudaram; a compatibilidade foi verificada diretamente pelo schema real com os novos outputs.

O gerador só escreve arquivos locais. O patch de migração `update-operations.json` não é idempotente e não deve ser reaplicado sobre o rascunho. `publicationStatus` em `model-config.json` é documentação, não bloqueio técnico de publicação.
