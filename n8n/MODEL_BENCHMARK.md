# Pipeline compacto: fidelidade e benchmark de modelos

Data: 20/09/2026. Workflow `MDQJ97FJOBn1yoHj` — TCC v0.1.

## Decisão

**Não publicado.** Recomendo o pipeline compacto com **Gemini 3.1 Flash-Lite como candidato à publicação**, condicionado a resolver a fidelidade factual e a aderência às preferências. Não recomendo publicar nenhuma configuração testada sem essa correção. A latência observada do Gemini ficou abaixo da meta, mas velocidade não aprova a qualidade.

- Rascunho final: `28377d4d-353e-45d1-a61a-fc830aa377f7`.
- Versão ativa preservada: `42de097c-1573-41a0-b5c6-1af5d99b03e1`.
- Grafo ativo, Webhook/Header Auth, validador original e ambos os responders comparados com o início desta rodada: iguais.
- Nove tentativas administrativas, sem chamar a Edge nem consumir créditos de usuários. Nenhuma nova execução após a comparação. Nenhuma publicação.

## Mudanças de fidelidade

O contexto distingue `preferencias_usuario` de `fatos_atracoes`. O prompt estabelece mundo fechado: só dados fornecidos fundamentam afirmações. Desejos do usuário, nomes sugestivos e categorias amplas não comprovam serviços específicos. Inclui exemplos negativos de rapel/tirolesa, esportes aquáticos, degustação, visita guiada, estrutura e condições de praias. Campos ausentes são desconhecidos. A regra cobre título, resumo e descrições.

Mantém escrita natural, com descrição neutra quando os dados são escassos. Duração permanece uma estimativa de visita; horários cadastrados não são garantia de funcionamento atual. Regiões representam as bases consultadas, sem pressupor limites administrativos. Não se mudou ranking, orçamento de candidatos, fallback, arquitetura ou contrato público.

Isso reduz ambiguidade do contrato, **mas não garante obediência do modelo**. As falhas abaixo demonstram o limite do prompt, mesmo com temperatura baixa. A validação existente é estrutural; não foi apresentada como verificador factual.

## Método

Modelos via a mesma credencial OpenRouter, catálogo consultado antes do teste:

- Atual: `deepseek/deepseek-v4-flash`.
- Alternativa 1: `google/gemini-3.1-flash-lite`.
- Alternativa 2: `mistralai/mistral-small-2603` (Mistral Small 4).

Mesma configuração para todos: temperatura `0.2`, teto de saída `8192`, `responseFormat: json_object`, zero retries. Sem mudança de raciocínio ou roteamento de provedor; OpenRouter usa a rota padrão. Timeout do modelo usa o saldo do orçamento de 55 s do pipeline. O teto não foi reduzido por caso para evitar truncamento e favorecer artificialmente um modelo.

Casos exatamente reaproveitados:

1. 2 dias, Grande Florianópolis, interesses praias/esportes, texto vazio.
2. 3 dias, Vale Europeu, interesse praias, texto: “gosto de praias tranquilas e com acesso a bares por perto”.
3. 5 dias, Vale Europeu + Grande Florianópolis, interesses praias/esportes/montanhas/gastronomia, texto vazio.

Execuções sequenciais, ordem de modelos rotacionada por caso. Contexto idêntico entre modelos de cada caso, confirmado por SHA-256. Prompt igual nas nove tentativas, salvo em `model-benchmark-prompt.txt`. Nenhum aquecimento ou retry oculto foi acrescentado pelo workflow. Uma tentativa de chamada de modelo por execução, inclusive nas falhas.

| Caso | Linhas lidas | Únicos válidos | Candidatos enviados | Caracteres de contexto | Fallback |
|---|---:|---:|---:|---:|---|
| 2 dias | 122 | 114 | 32 | 9.631 | Não |
| 3 dias | 114 | 85 | 77 | 28.290 | Sim: pouca oferta/baixa confiança |
| 5 dias | 236 | 194 | 76 | 26.735 | Não |

Um caso por modelo não mede p95, SLA ou estabilidade estatística. O benchmark compara estas configurações e a disponibilidade observada do provedor; não separa fila, prefill, raciocínio interno e emissão de tokens.

## Resultados

Tempos em segundos. Tokens são uso real reportado, entrada/saída. “—” significa não informado, não zero nem ausência de cobrança.

| Execução | Modelo | Caso | Total n8n | Chamada | Tokens entrada | Tokens saída | Resultado |
|---|---|---|---:|---:|---:|---:|---|
| 22 | DeepSeek | 2 dias | 55,091 | 53,870 | — | — | Timeout |
| 23 | Gemini | 2 dias | 3,821 | 3,182 | 5.589 | 557 | JSON válido; falha de adaptador, replay local aprovado* |
| 24 | Mistral | 2 dias | 1,292 | 0,792 | — | — | Rate limit |
| 25 | Gemini | 3 dias | 4,910 | 4,282 | 15.253 | 778 | Contrato válido; falha factual |
| 26 | Mistral | 3 dias | 2,010 | 0,841 | — | — | Rate limit |
| 27 | DeepSeek | 3 dias | 51,706 | 51,029 | 13.262 | 6.323 | Contrato válido; falha factual e de linguagem |
| 28 | Mistral | 5 dias | 3,257 | 2,251 | — | — | Rate limit |
| 29 | DeepSeek | 5 dias | 55,106 | 54,458 | — | — | Timeout |
| 30 | Gemini | 5 dias | 8,653 | 5,708 | 13.058 | 1.209 | Contrato válido; ressalvas factuais e de planejamento |

*A Chain em modo JSON entregou objeto já convertido, enquanto a hidratação esperava `text`. Corrigida a adaptação para aceitar objeto ou string, preservando o contrato. A resposta original #23 passou offline pela hidratação corrigida e pelo validador original, sem repetir a chamada ao modelo. Isso não transforma #23 em sucesso ponta a ponta da execução original. #25 e #30 passaram ao vivo após a correção. Nenhuma mudança de prompt ou de candidatos foi feita entre os modelos.

Sucesso estrutural ao vivo: Gemini 2/3, DeepSeek 1/3, Mistral 0/3. Respostas de modelo estruturalmente aproveitáveis após a correção: Gemini 3/3, DeepSeek 1/3; Mistral não retornou roteiro. A correção do adaptador também se aplica ao DeepSeek.

Contagens de tokens variam com o tokenizer mesmo para contexto idêntico. Tokens de saída podem incluir raciocínio não visível; não se presume que 6.323 tokens sejam exclusivamente o JSON exibido. Os erros do Mistral são rate limit; o prefixo “OpenAI” da camada compatível não significa que foi usado um modelo OpenAI. Não há evidência para atribuir a falha a uma quota específica. Seu tempo de rejeição não pode ser comparado como tempo de geração.

### Distribuição por etapa nos casos Gemini

| Etapa | 2 dias #23 | 3 dias #25 | 5 dias #30 |
|---|---:|---:|---:|
| Selecionar bases | 29 ms | 35 ms | 246 ms |
| Sheets batchGet | 461 ms | 412 ms | 1.732 ms |
| Preparar candidatos | 62 ms | 64 ms | 292 ms |
| Modelo | 3.182 ms | 4.282 ms | 5.708 ms |
| Hidratar | 27 ms, erro | 24 ms | 171 ms |
| Validador original | não executado | 12 ms | 91 ms |
| Responder sucesso | não executado | 1 ms | 10 ms |

A Chain contém o subnode do modelo; não somar seus tempos. Total também inclui overhead do motor. Sheets levou 356–1.732 ms nos nove casos; não justifica migrar as bases. O caso de 5 dias também teve maior overhead fora do modelo.

## Revisão factual e qualidade

Revisão manual de título, resumo e descrições contra os registros enviados. As saídas públicas completas estão em `model-benchmark-results.json`; o contexto e catálogo de cada execução, em `model-benchmark-evidence.json`. Não houve serviços de mapas ou geocodificação nesta revisão.

### Gemini, 2 dias (#23)

Seis visitas, três por dia, agrupamento coerente e descrições neutras. O resumo evita garantir esportes/infraestrutura não comprovados. Não foi encontrada invenção factual clara nesta amostra. Isso vale para esta resposta, não para todos os usos do modelo.

### Gemini, 3 dias (#25)

Nove visitas, três por dia; texto fluente, mas aderência ruim ao pedido de praias. O resumo afirma que a região não possui praias litorâneas e não atende ao interesse, embora **Praia do Centro e Praia da Solidão estivessem nos candidatos**. Usou uma generalização externa em vez de seguir os registros da base. Também afirma “boa infraestrutura” sem evidência suficiente e adiciona qualificação arquitetônica à catedral a partir de categorias genéricas de igreja.

A base Vale Europeu contém endereços de outras regiões: é uma limitação preexistente dos dados. O contrato usa região → base, sem inventar novos limites geográficos. Essa limitação não justifica ignorar candidatos presentes nem afirmar inexistência de opções.

### DeepSeek, 3 dias (#27)

Nove visitas distribuídas em 2/4/3, inclui praia e agrupa locais de forma razoável. Porém diz “única praia cadastrada” quando havia outra no contexto; chama Biergarten de “restaurante e bar” sem categoria/atributo de bar. Apresenta vários erros de português, como “rejiao”, “segintes” e “resturantes”. A única resposta concluída demorou 51,706 s; os outros dois casos expiraram.

### Gemini, 5 dias (#30)

Quinze visitas, três por dia, ambas as bases representadas, português claro e descrições majoritariamente neutras. Não inventou rapel/tirolesa. Ainda extrapola “produtos locais” em Paraíso das Ostras sem evidência de origem e atribui ao usuário “interesse por ecoturismo”, que não foi selecionado explicitamente.

Também propõe Norden pela manhã, embora os horários registrados sejam principalmente noturnos nos dias úteis e a partir de 11h no fim de semana. Sem data de viagem não se pode afirmar fechamento absoluto, mas o planejamento precisa tratar essa restrição melhor. O quarto dia acumula cerca de 50,5 km em segmentos retos entre visitas: sinal para revisão da distribuição, **não estimativa rodoviária nem prova de inviabilidade**. O cálculo é apenas diagnóstico local; não altera itinerário ou OSRM.

### Mistral

Sem saída nos três casos. Fidelidade, português e qualidade de planejamento não puderam ser avaliados. Não recomendar esse modelo com base em rejeições rápidas.

## Recomendação e pendências

1. Manter o pipeline compacto e Gemini 3.1 Flash-Lite no rascunho. Foi o único candidato com três respostas utilizáveis do modelo, latência de chamada entre 3,182 e 5,708 s e linguagem melhor que o DeepSeek nesta amostra. A execução total corrigida ficou em 4,910 e 8,653 s nos casos de 3 e 5 dias. Isso é evidência inicial, não promessa de latência em produção.
2. Antes de publicar, resolver o requisito factual. Mais uma frase no prompt não constitui garantia. Se a exigência for impedir afirmações sem evidência, a opção mais controlável é restringir a descrição a fatos referenciados/atributos permitidos e compor trechos neutros deterministicamente; o modelo continua escolhendo e organizando atrações. Título e resumo também precisam dessa proteção. Isso é uma próxima alteração a avaliar, **não foi implementada nem validada nesta rodada**, e pode reduzir variedade textual.
3. Corrigir aderência aos candidatos de praia e revisar horários/agrupamento. Usar estas quatro respostas já salvas como fixtures para revisão offline; depois, apenas uma verificação pequena da configuração corrigida. Não fazer nova bateria agora. Nenhuma publicação automática foi preparada.

Não vale migrar Sheets, alterar frontend/créditos, aumentar o timeout público, adicionar retries de geração, escolher Mistral pelos tempos de erro ou declarar que temperatura baixa elimina alucinação. Não houve necessidade de mexer em mapa, OSRM ou banco.

## Validações e artefatos

- Testes locais do pipeline: 17 passaram, incluindo separação fatos/preferências, objeto/string JSON, deduplicação, diversidade, fallback, IDs, ordem global, dias parcialmente vazios e rejeição de vazio total.
- Replay offline das quatro respostas de modelo pelo contrato e validador original: aprovado estruturalmente; contextos por caso idênticos por SHA-256.
- `npm run typecheck` e `npm run lint`: passaram nesta rodada.
- MCP `validate_node_config` e `validate_workflow`: válidos; SDK final com dez nodes, sem erros reportados.
- Build, testes do app e da Edge já passaram na rodada anterior. Não repetidos aqui: nenhum código dessas áreas mudou nesta rodada.
- Revisão de produção: versão ativa e grafo preservados, Webhook/Header Auth, validador e responders iguais ao início.

Fontes alteradas: `system-prompt.txt`, `pipeline.mjs`, `pipeline.test.mjs`, `build-workflow.mjs`, `README.md`. Nova configuração: `model-config.json`. Gerados atualizados: `workflow.sdk.js`, `update-operations.json`, `tcc-v0.1.draft.json`.

Evidências novas: `list-benchmark-models.mjs`, `model-benchmark-catalog.json`, `model-benchmark-protocol.json`, `model-benchmark-prompt.txt`, `model-benchmark-evidence.json`, `analyze-model-benchmark.mjs`, `model-benchmark-results.json`, este relatório. O catálogo pode conter outros modelos encontrados, mas somente os três identificados acima foram testados.

Nodes com mudanças nesta rodada: **Selecionar bases / Preparar candidatos** (cópia do módulo com novo contexto); **Montar roteiro** (prompt factual); **OpenRouter Chat Model** (configuração e modelos do benchmark); **Recuperar locais reais** (aceitar objeto/string). O restante da arquitetura foi preservado. O SDK pode conter cópias atualizadas de funções não chamadas em alguns Code nodes; o snapshot remoto registra exatamente o rascunho testado.

`model-config.json.publicationStatus` documenta a pendência; não implementa autorização nem bloqueio técnico. `update-operations.json` continua sendo patch de migração do workflow antigo, não deve ser reaplicado cegamente sobre o rascunho.
