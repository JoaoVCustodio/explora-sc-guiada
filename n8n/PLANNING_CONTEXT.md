# Contexto geográfico e horários para decisão da IA

Data: 20/09/2026. TCC v0.1, workflow `MDQJ97FJOBn1yoHj`.

## Estado e decisão

**Implementado apenas no rascunho. Não publicado.** Versão do rascunho: `6a21faff-884b-4a67-a8a7-99ac0d0f5c35`. Versão ativa intacta: `42de097c-1573-41a0-b5c6-1af5d99b03e1`.

O novo contexto trouxe melhora clara no caso de 5 dias e respeitou a preferência explícita por um deslocamento longo no mesmo dia. Os quatro casos mantiveram a estrutura pública e a fidelidade dos textos, com tempos de 2,660 a 3,883 s. A melhora de qualidade não foi uniforme: o caso de 3 dias ainda perdeu aderência a praias/bares próximos, e o caso adicional apresentou um período ocasional e um segundo dia vazio.

**Ainda não recomendo publicação geral.** A configuração é uma evolução para revisão, mas estes exemplos não sustentam afirmar que planejamento, horários e preenchimento dos dias estejam confiáveis. Não houve publicação ou agendamento de publicação.

## 1. Informação geográfica

O módulo `planning-context.mjs` calcula Haversine usando apenas as coordenadas dos candidatos já selecionados. Escolhe até quatro atrações de referência: extremos norte/sul/leste/oeste do conjunto, removendo repetições. Todas as atrações recebem um vetor `geo_km` com distâncias às **mesmas referências, na mesma ordem**, arredondadas a 0,1 km. As referências também levam nome e coordenadas para interpretação.

É um referencial comum, não uma divisão em áreas. Não há centróides, atribuição de candidatos a grupos ou indicação de próximo local. Nenhum candidato é removido, promovido ou reordenado por essa informação. O volume adicional cresce proporcionalmente à quantidade de candidatos; não se envia uma matriz quadrática de todas as combinações.

O prompt esclarece que:

- São distâncias em linha reta, não rodoviárias nem tempos de viagem.
- Referências não são visitas obrigatórias; diferenças grandes entre distâncias às mesmas referências ajudam a perceber a escala do deslocamento.
- A prioridade é texto livre/preferências explícitas → interesses → relevância → coerência geográfica.
- Aceitação de deslocamentos grandes e pedidos de locais específicos no mesmo dia devem ser preservados.
- Não há distância máxima permitida nem obrigação de selecionar locais próximos.

Coordenadas e endereços originais continuam disponíveis. Não se chamou OSRM, mapa, geocodificação ou fonte externa. O mecanismo anterior de pré-seleção/diversidade permanece; não se acrescentou um algoritmo para montar a sequência de visitas.

## 2. Horários normalizados

Os horários brutos `h` continuam no contexto. A informação adicional `hp` resume manhã (06–12), tarde (12–18) e noite (18–24):

- `conhecidos`: quantos dos sete dias da semana têm horários interpretados com confiança.
- `dias`: número de dias conhecidos com alguma abertura em cada período.
- `janela_tipica`: mediana da maior janela contínua por período, incluindo zero nos dias conhecidos sem abertura.
- `janela_max`: maior janela contínua registrada por período.
- `conflito`: sinaliza horários divergentes em registros duplicados; nesse caso o resumo fica desconhecido.

Exemplo de Norden Blumenau:

```json
{"conhecidos":7,"dias":[2,7,7],"janela_tipica":[0,60,360],"janela_max":[60,360,360]}
```

Isso comunica que a manhã aparece somente em dois dias e por uma janela curta; a noite tem abertura mais ampla nos sete dias. O modelo também pode consultar os horários exatos, incluindo os dias da semana.

O parser reconhece horários em intervalos, pausas, fechado, funcionamento 24 horas e passagem da meia-noite. Intervalos adjacentes/sobrepostos são unidos apenas para calcular a janela de abertura; pausas não são somadas como disponibilidade contínua. Abertura que atravessa a meia-noite pode contribuir para a manhã seguinte quando há dados conhecidos suficientes, inclusive no ciclo domingo/segunda.

Dias ausentes, texto não reconhecido, intervalos ambíguos como `00:00–00:00` e contradições não viram disponibilidade inventada. Sem dados, `conhecidos:0` e os vetores são `null`, não listas de dias fechados. Formatos não reconhecidos permanecem em `h`, sem interpretação automática. Noite neste resumo termina às 24h; o horário original permite ao modelo ver intervalos depois disso.

Não existe data de início da viagem no contrato. Portanto, contagens semanais indicam compatibilidade habitual/ocasional, não garantem que o local estará aberto no dia concreto da visita. Essa limitação é explicitada no contexto.

## 3. Liberdade de decisão e preservação

A IA continua selecionando os IDs, os dias, períodos, durações e a sequência. A hidratação mantém a ordem dos arrays, atribuindo apenas a numeração global já existente. O modelo continua Gemini 3.1 Flash-Lite, com uma chamada, temperatura 0.2, teto 8192, JSON mode, zero retries e o orçamento anterior.

O novo diagnóstico calcula distâncias dos trechos da sequência **já escolhida** e compatibilidade do período com os horários conhecidos. Ele não rejeita, substitui, remove, move ou repete visitas. Trechos acima de 50 km recebem apenas uma contagem interna para revisão; esse limiar não aparece como regra no prompt nem bloqueia o caso que aceita deslocamento longo.

`planningDiagnostics` fica nos dados internos do node, ao lado de `factualAudit` e `output`. O validador original lê `output` e devolve o contrato público inalterado. Logs registram contagens/tempos, sem imprimir texto livre.

Comparação final com o início da rodada confirmou:

- Grafo publicado e conexões idênticos.
- Webhook/Header Auth, consulta Sheets, modelo/configuração, validador e responders idênticos.
- Funções de descrições, título/resumo, duração e hidratação factual idênticas.
- As três entradas comparáveis preservaram os mesmos candidatos e sua ordem. Nenhum conflito novo de horários foi encontrado nesses catálogos.
- Texto livre integral e interesses preservados.

## 4. Protocolo e tempos

Quatro execuções manuais sequenciais (#34–37), uma chamada cada, sem retries e sem passar pela Edge ou consumir créditos de usuários. Não houve repetições para escolher respostas melhores.

Os primeiros três casos são idênticos à rodada anterior:

1. 2 dias, Grande Florianópolis, praias/esportes, sem texto livre.
2. 3 dias, Vale Europeu, praias, texto “gosto de praias tranquilas e com acesso a bares por perto”.
3. 5 dias, Vale Europeu + Grande Florianópolis, praias/esportes/montanhas/gastronomia, sem texto livre.

Caso adicional, 2 dias/Grande Florianópolis/praias:

> Quero visitar Mirante do Encanto e Praia da Armação no mesmo dia. Não me importo em dirigir bastante e aceito deslocamentos maiores para conhecer esses dois locais.

| Caso | Execução | Total antes → depois | Modelo antes → depois | Tokens entrada antes → depois | Tokens saída antes → depois |
|---|---|---|---|---|---|
| 2 dias | #31 → #34 | 4,192 → 3,883 s | 2,671 → 2,003 s | 4.946 → 7.523 | 146 → 214 |
| 3 dias | #32 → #35 | 3,435 → 2,941 s | 2,765 → 2,322 s | 14.610 → 20.925 | 430 → 220 |
| 5 dias | #33 → #36 | 3,407 → 3,577 s | 2,703 → 2,483 s | 12.415 → 18.052 | 366 → 301 |
| Deslocamento aceito | #37 | 2,660 s | 2,003 s | 12.400 | 62 |

Candidatos enviados: 32 / 77 / 76 / 56. A entrada cresceu com o contexto adicional (aproximadamente 44–52% nos casos comparáveis); os tempos permaneceram próximos dos anteriores nesta amostra. Não houve troca de modelo nem otimização de velocidade. Quatro casos não medem SLA ou p95.

## 5. Exemplos e revisão de qualidade

As distâncias abaixo somam trechos em linha reta dentro do dia, excluindo deslocamentos entre dias, hotel/origem/destino. As seleções mudaram: não se deve tratar redução de distância isolada como prova de melhoria global. O diagnóstico arredonda cada trecho a 0,1 km; diferenças de 0,1 km para relatórios anteriores são arredondamento.

### 2 dias — #34

- Dia 1: Trilha Caminho dos Naufragados → Praia Naufragados, cerca de 1,9 km retos.
- Dia 2: Trilha Praia do Gravatá → Praia Mole, cerca de 1,0 km reto.
- Preferências por praias/esportes mantidas, agrupamento próximo, nenhum dia vazio.
- Quatro visitas em vez das seis anteriores. Durações somadas de 6h e 5h30; quantidade não foi limitada por código. Algumas praias não têm horário cadastrado, corretamente permanecendo desconhecidas.

### 3 dias — #35: resultado ainda insatisfatório

- Maior soma diária caiu de 94,7 para 64,3 km, mas os três dias ainda acumularam aproximadamente 53,4 / 64,3 / 59,7 km.
- Dia 1: Praia do Centro → Bierstelle I Pub → E-10 Tap House. O deslocamento da praia ao primeiro estabelecimento é de aproximadamente 51,2 km retos; não atende bem à intenção de bares por perto.
- Dias seguintes priorizaram rio/cachoeiras e bares. Apenas uma praia foi mantida, contra duas na rodada anterior: regressão de aderência ao pedido explícito, apesar de os demais locais também serem turísticos.
- Container da Serra foi colocado à tarde, período com abertura registrada somente em três dos sete dias. Sem data de viagem, isso exige revisão.
- Nove visitas e três dias preenchidos, mas estrutura válida não equivale a bom planejamento. Não recomendo considerar esse caso aprovado em qualidade.

### 5 dias — #36: melhora observada

- Norden Blumenau mudou de manhã para noite, com abertura noturna registrada nos sete dias e janela típica de 6h.
- Maior soma diária caiu de 50,5 para 27,4 km. Novas somas: 16,7 / 3,7 / 1,8 / 27,4 / 14,7 km.
- Locais de Florianópolis ficaram nos três primeiros dias; Pomerode/Blumenau e outras atrações da segunda base nos últimos dois, por decisão da IA.
- O dia de Pomerode/Blumenau contém Tour Nugali → Biergarten Pomerânia → Norden. O dia de cachoeiras deixou de passar por Container da Serra.
- Doze visitas em vez de quinze. Interesses e ambas as bases representados, sem dias vazios. A melhora geográfica tem esse contexto; não representa o mesmo conjunto de visitas otimizado.
- Nenhum período selecionado ficou restrito a uma minoria dos dias conhecidos, mas isso não garante coincidência com as datas reais de viagem. Biergarten, por exemplo, não abre todos os dias.

### Deslocamento aceito — #37: liberdade comprovada, outras ressalvas

- Mirante do Encanto e Praia da Armação ficaram no mesmo dia, com trecho de cerca de **74,4 km retos**.
- Ambos foram preservados, sem reordenação pelo código ou corte por distância. Esse teste confirma que proximidade não se tornou uma regra rígida.
- Porém o modelo colocou o mirante pela manhã, compatível com o cadastro apenas no fim de semana (dois de sete dias).
- O segundo dia ficou vazio, embora houvesse 56 candidatos. O usuário pediu os dois locais no mesmo dia, mas não pediu que fossem as únicas visitas. A saída respeita a permissão contratual de dias vazios, porém não demonstra bom preenchimento do pedido de dois dias.

### Fidelidade factual e contrato

Foram verificados 27 locais exibidos nas quatro execuções, mais títulos/resumos: nome e coordenadas correspondem às fontes, descrições vêm das funções factuais inalteradas e suas evidências correspondem às categorias/atributos/avaliações dos candidatos. Não foram encontrados fatos inventados nos textos.

Todos os outputs passaram pelo validador original e pelo schema real do frontend. A ordem final foi comparada aos IDs na resposta do modelo: igual em todos os casos. Os diagnósticos foram recalculados offline e comprovadamente não mutaram os outputs.

## 6. Limitações e recomendação de publicação

O objetivo de fornecer mais contexto sem transferir decisões para código foi cumprido. Há melhora observada em agrupamento e em horários do caso de 5 dias, e a intenção de deslocamento longo foi preservada. A IA, porém, ainda pode ignorar sinais úteis: vetores e contagens são informação, não uma garantia de adesão.

Não recomendo publicação geral com base nestas saídas. Pendências concretas: aderência ao pedido de praias/bares próximos, uso de abertura ocasional sem datas e dias vazios sem necessidade demonstrada. A base Vale Europeu também contém locais fora da região administrativa, situação preservada conforme o mapeamento existente.

Esses casos estão salvos para revisão de qualidade; não é necessário repetir uma bateria para reencontrá-los. Uma próxima intervenção deve manter as decisões com a IA e tratar esses exemplos como critérios de aceitação, sem introduzir clusters rígidos, algoritmos de rota, correções automáticas posteriores ou troca de modelo por consequência desta rodada.

## 7. Testes, arquivos e reprodução

- `node --test n8n/pipeline.test.mjs n8n/planning-context.test.mjs`: **32 testes passaram**.
- `node --experimental-strip-types n8n/verify-planning-benchmark.mjs`: quatro outputs, 27 locais, fatos/ordem/schema/contexto auxiliar verificados.
- `npm run typecheck` e `npm run lint`: passaram.
- MCP `validate_node_config` e `validate_workflow`: válidos, dez nodes.
- Não foram repetidos build e testes gerais de app/Edge: essas áreas não mudaram; o contrato foi exercitado diretamente com o schema real e as respostas novas.

Novos: `planning-context.mjs`, `planning-context.test.mjs`, `verify-planning-benchmark.mjs`, `planning-benchmark-evidence.json`, `planning-benchmark-results.json`, `planning-benchmark-integrity.json`, `planning-benchmark-prompt.txt`, este relatório.

Atualizados: `pipeline.mjs` (enriquecimento do contexto e sinal de conflito de horários), `system-prompt.txt` (prioridades/contexto auxiliar), `build-workflow.mjs` (inclusão do módulo e diagnóstico), `model-config.json` (status documental), `README.md`, `workflow.sdk.js`, `update-operations.json`, `tcc-v0.1.draft.json`.

Nodes de rascunho atualizados: Selecionar bases e Preparar candidatos (módulo compartilhado), Montar roteiro (prompt) e Recuperar locais reais (diagnóstico). Não houve mudança de frontend, mapa/OSRM, créditos, banco, parceiros, comunidade, fonte Sheets ou descrições factuais protegidas.

`node n8n/build-workflow.mjs` apenas gera arquivos locais. `update-operations.json` continua um patch da migração original, não é idempotente para reaplicar no rascunho. O status em `model-config.json` é documental; não publica nem implementa uma autorização técnica.
