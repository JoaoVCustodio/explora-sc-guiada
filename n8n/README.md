# TCC v0.1 — otimização de candidatos

## Suporte a `full_day` — 24/09/2026

Implementado no rascunho do workflow `MDQJ97FJOBn1yoHj` (versão `3e5a0405-391f-4926-9301-7eedc3ae8a64`), **sem publicação**. A versão ativa continua `a584937f-ce0e-4372-b04e-ed92e0c5a0d4`.

- A normalização aceita apenas `true` booleano ou texto `TRUE` (sem distinguir maiúsculas/minúsculas). Campos vazios, ausentes e outros valores viram `false`. Em IDs duplicados, `true` prevalece. O catálogo e `fatos_atracoes` recebem `full_day`; a pontuação e a pré-seleção não usam esse campo.
- Os prompts principal e corretivo instruem o modelo a deixar a atração escolhida sozinha no dia, sem torná-la obrigatória. O quality gate emite `FULL_DAY_SHARED` quando ela divide o dia. A correção existente recebe a falha e seus candidatos; a saída é revalidada uma vez e rejeitada se o conflito persistir ou não houver tempo para corrigir.
- Testes locais: 57 testes n8n e 53 testes da aplicação passaram; lint, typecheck e build passaram. Execução manual n8n `#60` leu Beto Carrero World da aba Litoral Norte com `full_day=true`, escolheu-o no Dia 1 sozinho e passou pelo gate e contrato público. O caminho corretivo para `FULL_DAY_SHARED` foi exercitado com o código gerado e resposta simulada, sem chamada real ao modelo corretivo.

Arquivos editáveis: `pipeline.mjs`, `quality-gate.mjs`, `system-prompt.txt`, `correction-prompt.txt` e testes correspondentes. `build-workflow.mjs` regenerou `workflow.sdk.js` e `update-operations.json`; este último continua sendo um patch histórico de migração, não deve ser reaplicado ao rascunho atual.

## Estado atual: data opcional de início — 21/09/2026

Implementação local de frontend/Edge e rascunho n8n concluída, sem deploy/publicação. Datas derivadas por código; horário semanal usado para o dia real quando informado, preservando incerteza. Duas execuções reais: 5,494 s e 3,484 s, ambas com uma chamada Gemini. Relatório, testes e ativação: [CALENDAR_DATE.md](CALENDAR_DATE.md).

## Histórico: quality gate — 21/09/2026

**Somente rascunho, não publicado.** Gate conservador de dias vazios, prioridade explícita por praias e incompatibilidade comprovada de horários, com no máximo uma correção pelo Gemini original. Prompt principal e produção preservados. Testes completos: 5,584 s sem correção e 5,050 s com correção. Recomendada publicação controlada após autorização. Resultados, limitações e arquivos: [QUALITY_GATE.md](QUALITY_GATE.md).

Os estados abaixo são históricos.

## Histórico: contexto de planejamento — 20/09/2026

**Somente rascunho, não publicado.** Foram adicionadas distâncias Haversine a referências comuns e resumos de abertura por período como informação para a IA. Não há agrupamento obrigatório, reorganização posterior ou bloqueio por distância. Gemini, chamada única e textos factuais determinísticos foram preservados.

Quatro testes (#34–37) concluíram entre 2,660 e 3,883 s. O caso de 5 dias melhorou o agrupamento e colocou Norden à noite. O caso com dois locais distantes manteve ambos no mesmo dia, conforme pedido. Persistiram limitações de aderência a praias/bares próximos, horários ocasionais e um dia vazio sem justificativa clara. **Ainda não recomendo publicação geral.** Veja [PLANNING_CONTEXT.md](PLANNING_CONTEXT.md).

Rascunho atual: `6a21faff-884b-4a67-a8a7-99ac0d0f5c35`. Produção preservada: `42de097c-1573-41a0-b5c6-1af5d99b03e1`. Novo módulo editável: `planning-context.mjs`; o gerador inclui esse módulo nos Code nodes.

## Estado atual: fidelidade determinística — 20/09/2026

Histórico da rodada anterior; preservado para comparação. O mecanismo de fidelidade abaixo permanece igual no rascunho atual.

**Somente rascunho, não publicado.** A IA agora retorna apenas IDs, dias, períodos e duração numérica. Título, resumo e descrições são construídos por código a partir do pedido e de fatos dos candidatos. Nenhuma prosa livre do modelo é exibida. Gemini 3.1 Flash-Lite, uma chamada, arquitetura e contrato público preservados.

Os três casos novos (#31–33) concluíram em 4,192 s / 3,435 s / 3,407 s. As 30 descrições e identidades foram verificadas contra os registros, e os três resultados passaram pelo validador original e pelo schema real do frontend. **Fidelidade aos dados adequada nesta amostra; publicação geral ainda não recomendada devido a planejamento geográfico/horários.** Ver [FACTUAL_GROUNDING.md](FACTUAL_GROUNDING.md) para a decisão, revisão explícita, limitações, comparação e arquivos.

Rascunho: `c752fe8d-ca95-4685-b3cd-993826ab656f`. Publicado, sem alteração: `42de097c-1573-41a0-b5c6-1af5d99b03e1`.

## Atualização: benchmark de modelos e fidelidade — 20/09/2026

Histórico da rodada anterior; substituído pelo estado atual acima. Para reproduzir essa comparação histórica, o analisador agora usa a cópia congelada `model-benchmark-pipeline.mjs`.

**Rascunho mantido sem publicação.** A comparação controlada terminou: nove tentativas, três modelos, os mesmos três casos. Gemini 3.1 Flash-Lite foi o melhor candidato de latência, mas ainda apresentou extrapolações factuais. Nenhuma configuração recebeu aprovação de qualidade para publicação.

Veja [MODEL_BENCHMARK.md](MODEL_BENCHMARK.md) para tempos, tokens, falhas, revisão factual e recomendação. O rascunho atual usa `google/gemini-3.1-flash-lite`; `model-config.json` registra a configuração e a pendência de qualidade (metadado documental, não bloqueio técnico). Produção permanece na versão `42de097c-1573-41a0-b5c6-1af5d99b03e1`.

O contexto agora separa `preferencias_usuario` de `fatos_atracoes`. O prompt exige descrições neutras quando faltam evidências, inclusive no título e resumo. A hidratação aceita JSON textual ou já convertido em objeto. A pré-seleção e o validador original foram preservados. Nesta rodada não houve alterações ou deploy de Edge, frontend, créditos ou banco.

Fontes: `pipeline.mjs`, `system-prompt.txt`, `model-config.json`, `build-workflow.mjs`. O gerador continua apenas produzindo arquivos locais. O prompt exato usado nos nove testes está congelado em `model-benchmark-prompt.txt`.

## Histórico: primeira rodada em 20/09/2026

As seções abaixo documentam a rodada anterior, antes do benchmark de modelos. Suas referências a modelo, versões, testes e limitações são históricas; o estado atual está no relatório acima.

**Implementação no rascunho, NÃO publicada.** Os testes demonstraram a redução de contexto e a chamada única, mas não demonstraram performance e qualidade suficientes para substituir a produção.

- Workflow: `MDQJ97FJOBn1yoHj`.
- Versão publicada preservada: `42de097c-1573-41a0-b5c6-1af5d99b03e1`.
- Rascunho avaliado: `b239a514-ea00-49d2-a012-43bd51ed48d2`.
- Edge `generate-itinerary`: publicada com apenas o encaminhamento de `requestId` e a remoção da rejeição de dias parcialmente vazios. Roteiro totalmente vazio continua rejeitado. Autenticação, créditos, idempotência, devolução e limites existentes preservados.

## Arquitetura

Antes: Webhook → AI Agent → escolha de tools pelo modelo → Google Sheets → segunda chamada ao modelo → Validar itinerário → resposta.

Rascunho: Webhook → Selecionar bases → Consultar bases selecionadas → Preparar candidatos → Montar roteiro (Basic LLM Chain, uma entrada) → Recuperar locais reais → **o mesmo** Validar itinerário → **a mesma** resposta.

O modelo continua `deepseek/deepseek-v4-flash`, com a credencial original. Webhook, URL, Header Auth, validador e contrato externo foram preservados. Não há migração de dados, cache de atrações, alteração de Sheets ou chamadas ao mapa/OSRM.

### Leitura de Sheets

Mapeamento fixo das sete regiões para as mesmas abas originais. Somente as escolhidas entram em `ranges`.

Uma leitura GET `spreadsheets.values.batchGet`, com a credencial OAuth existente, retorna as abas na ordem solicitada, inclusive as vazias. HTTP Request foi escolhido porque o node Google Sheets não oferece batchGet e resolve `sheetName` a partir do primeiro item; passar várias regiões diretamente a esse node não seria seguro. Não há HTTP dentro de Code nodes.

Referências: [API batchGet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet), [implementação do router Google Sheets do n8n](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Google/Sheet/v2/actions/router.ts).

### Normalização e seleção

- Parse de JSON aninhado de nome, localização, types, horários e atributos.
- Deduplicação pelo ID real do Google Places, com união de types e regiões de origem. Atributos contraditórios ficam desconhecidos.
- Nomes vazios/maiores que o contrato, IDs ausentes, coordenadas inválidas e locais permanentemente fechados são excluídos e contados.
- Remoção de telefone, URL, row_number, colunas auxiliares e dados voláteis de abertura. Categorias genéricas `establishment`/`point_of_interest` são omitidas; categorias específicas são preservadas.
- Nome, coordenadas, endereço, categorias, nota/quantidade de avaliações, horários semanais, atributos conhecidos e preço permanecem disponíveis. Horários iguais são agrupados sem apagar dias ou intervalos.
- Ranking por interesses, termos/aliases do texto, nomes explicitamente citados e um pequeno sinal de avaliação. O texto original completo sempre chega ao modelo.
- Cobertura inicial de cada região, interesse e sinal textual; preenchimento com diversidade de categorias e células geográficas. Nunca escolhe simplesmente as primeiras linhas.
- Orçamento normal: `max(32, dias*12 + regioes*8)`. Termos desconhecidos, negativas, ausência de sinais ou poucos candidatos relevantes ampliam o orçamento em 75%, limitado apenas pelo conjunto disponível. Nomes explicitamente citados são preservados mesmo acima do orçamento.
- Fallback conservador: amplia alternativas, não inventa correspondências semânticas. Ausência total de candidatos gera erro antes da IA.

### Saída e concorrência

O modelo seleciona IDs curtos e escreve dias, períodos, duração e descrições. Hidratação recupera nome/coordenadas exatos, rejeita IDs desconhecidos/repetidos e numera a ordem global **sem reordenar** os arrays. O validador original permanece byte a byte igual.

A agregação produz exatamente um item para uma chamada de modelo. Retries automáticos do modelo e dos novos nodes ficam desativados; nenhum fallback faz uma segunda chamada. O orçamento do modelo é o tempo restante até 55 s desde `Selecionar bases`, deixando margem para o timeout de 60 s da Edge. Isso não elimina variação de fila/rede do provedor.

Erros convergem para o responder sanitizado já existente, HTTP 422. O status n8n `success` apenas indica que o workflow terminou: **não significa roteiro válido** quando esse ramo foi acionado. Use `contractValid` no benchmark ou a execução do responder de sucesso.

### Observabilidade

`requestId` segue da Edge para o n8n; testes administrativos usam IDs demonstrativos. Na ausência dele, o fluxo usa `n8n-<executionId>`. Logs adicionados contêm identificador, contagens, contexto em caracteres e tempos; não imprimem texto livre, credenciais ou registros turísticos. Dados normais de execução continuam sujeitos à configuração de retenção do n8n.

`Preparar candidatos.metrics` registra linhas, inválidos, duplicatas, conflitos, bases vazias, candidatos disponíveis/enviados, fallback, tamanho do contexto e tempo de pré-processamento. Tempos precisos dos nodes e uso de tokens são obtidos dos dados de execução do n8n. Não foi adicionada uma tabela de telemetria.

## Medições

Baseline reaproveitado, sem novas gerações do fluxo antigo. Os testes novos foram administrativos/manuais: chamaram Sheets e o modelo, mas não chamaram a Edge nem consumiram créditos de usuários.

| Caso | Baseline | Novo | Candidatos enviados | Tokens de entrada da chamada principal |
|---|---:|---:|---:|---:|
| 2 dias, Florianópolis, praias/esportes | 36,509 s (#15) | 36,020 s (#17, primeiro rascunho) | 32 de 114 válidos únicos | 54.090 → 5.627 |
| 3 dias, Vale Europeu, praias tranquilas/bares | 27,143 s (#11, prompt anterior) | timeout em 55,099 s (#20) | 77 de 85, fallback ativo | sem uso real retornado; estimativa n8n 11.261 |
| 5 dias, Florianópolis + Vale Europeu | 48,724 s (#13) | 35,358 s (#21, rascunho final) | 76 de 194 válidos únicos | 111.969 → 11.552 |

Os tokens acima são da chamada principal, não incluem a seleção de tools do baseline (mais 2.036 / 1.968 / 2.056 tokens respectivamente). As chamadas passaram de duas para uma em todos os novos testes. Não confundir `estimatedTokens` do n8n com uso real do provedor.

Etapas do rascunho final:

| Etapa | 3 dias (#20) | 5 dias (#21) |
|---|---:|---:|
| Selecionar bases | 33 ms | 29 ms |
| Sheets batchGet | 369 ms | 556 ms |
| Preparar candidatos | 88 ms | 167 ms |
| Modelo | 54.468 ms, timeout | 34.464 ms |
| Hidratar | não executado | 41 ms |
| Validador original | não executado | 17 ms |
| Respond to Webhook | ramo de erro | 2 ms |

A Chain inclui o tempo do subnode do modelo: **não somar ambos**. A execução #17 retornou 7 locais, e #21 retornou 13; os baselines tinham 10 e 15. A quantidade não foi limitada para acelerar. A mudança de quantidade impede afirmar equivalência de experiência apenas com validação estrutural.

Execuções feitas: #16 falhou antes de consultar Sheets/modelo por serialização de query; corrigido. #17–19 foram os três casos iniciais; #18 e #19 atingiram 45 s. Depois de compactar horários e ajustar orçamento, somente os dois casos com falha foram revalidados (#20–21). Total: **cinco chamadas ao modelo**, sem bateria adicional. Detalhes sanitizados em `benchmark-results.json`.

### Limitações encontradas e decisão de publicação

O contexto caiu aproximadamente 90% nos casos com medição real, mas 10–15 s **não foi alcançado**. O caso de 5 dias melhorou 27,4%; o de 2 dias ficou praticamente igual; o caso de 3 dias falhou duas vezes. O tempo remanescente está dentro da chamada ao modelo; a instrumentação atual não separa fila do provedor, prefill, raciocínio e emissão de tokens.

O JSON dos dois casos concluídos passou pelo validador, sem IDs repetidos e com coordenadas exatas. O caso de 5 dias cobriu ambas as bases. Isso não prova qualidade semântica: o modelo ainda descreveu serviços não comprovados pelos campos fornecidos (por exemplo, rapel/tirolesa), apesar da instrução contrária. A base Vale Europeu contém também registros cujos endereços são de outras regiões; foi mantida a definição existente região → aba, sem inventar novos limites geográficos.

Por esses motivos, o novo workflow permanece **em rascunho**, e a versão publicada foi preservada. Não é apropriado ativá-lo como melhoria de performance comprovada. Próximo passo: diagnosticar a chamada do mesmo modelo/provedor e a fidelidade das descrições com uma experiência pequena e explicitamente delimitada. Não trocar modelo, desativar raciocínio ou aumentar o timeout público sem avaliar qualidade e efeito nos créditos.

## Validação e manutenção

- `node --test n8n/pipeline.test.mjs`: 15 testes passaram.
- `npm test`: 40 testes existentes passaram.
- `npm run test:edge`: 1 suíte, 11 passos passaram; inclui requestId, dias parcialmente vazios, rejeição de vazio total, créditos, autenticação, replay, timeout e devolução.
- `npm run typecheck`, `npm run lint`, `npm run build`: passaram. Build mantém aviso preexistente do tamanho do chunk MapLibre.
- `validate_node_config` e `validate_workflow` MCP: válidos, sem avisos na configuração final.
- O validador n8n original não foi modificado; os testes executam sua cópia exata.
- O endpoint de produção registrado nas execuções reais é `/webhook/analizer`. A URL sugerida pelo MCP com o UUID do webhook intercalado retornou 404; não usar essa variante na Edge.
- `node n8n/check-auth-boundaries.mjs`: endpoints reais confirmados, n8n 403 e Edge 401 sem credenciais; nenhuma geração iniciada.
- Não houve mudanças SQL/RLS ou migrações nesta rodada.

Fontes editáveis: `pipeline.mjs`, `system-prompt.txt`, `build-workflow.mjs`. `node n8n/build-workflow.mjs` gera `workflow.sdk.js` e `update-operations.json` para revisão/validação, sem publicar ou executar serviços.

**Não reaplicar cegamente `update-operations.json`: é o patch de migração a partir do workflow anterior**, não um script idempotente. O SDK contém referências simbólicas às credenciais existentes para validação; não deve ser importado como um novo workflow de produção sem vincular as credenciais. `tcc-v0.1.before.json` é uma cópia sanitizada, não um backup de secrets. A versão anterior completa continua no histórico do servidor.
