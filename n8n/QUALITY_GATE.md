# Quality gate — 21/09/2026

## Estado

Implementado e testado somente no rascunho `2cd75c4d-7bfd-4285-8fee-9cd91cfda7d9` do workflow `MDQJ97FJOBn1yoHj`. Produção permanece em `42de097c-1573-41a0-b5c6-1af5d99b03e1`; grafo ativo idêntico ao início desta rodada.

## Regras

- Dia vazio: falha apenas com confiança na compatibilidade das preferências e pelo menos dois candidatos relevantes não utilizados por dia vazio. Descanso explícito, restrições ou qualificadores não compreendidos fazem o detector abster-se. Dias vazios sem oferta suficiente continuam permitidos.
- Praias: detector específico para prioridade explícita em texto livre, pelo menos dois dias, no máximo uma praia utilizada, pelo menos duas praias disponíveis não usadas e pelo menos duas visitas discricionárias a outros tipos. Não impõe quantidade universal de praias; locais nominalmente pedidos são protegidos.
- Horários: rejeita período sem abertura em nenhum dos sete dias conhecidos. Dados incompletos ou disponibilidade em apenas alguns dias são incertos, nunca motivo isolado de reprovação. Não infere a data da viagem.
- Distância: somente diagnóstico; nenhuma rejeição ou reorganização.
- O gate nunca altera visitas. A IA permanece responsável por IDs, dias, períodos, duração e sequência.

## Correção e validação

Fluxo normal: geração → recuperação factual → validador original + gate → resposta. Em falha material: uma chamada corretiva com plano, motivos, preferências integrais e candidatos pertinentes → recuperação factual → validador original + gate novamente. Persistindo falha, retorna o erro genérico existente; não há terceira chamada nem preenchimento por código.

O ramo corretivo compartilha o subnode Gemini 3.1 Flash-Lite original. Sem retry automático do provedor. O prompt principal, modelo/configurações, Sheets, contexto geográfico/horários e validador original foram preservados. O orçamento compartilhado de 55 segundos impede iniciar correção quando resta menos de um segundo.

## Resultados medidos

| Caso | Execução | Resultado | Tempo n8n | Modelo(s) | Tokens entrada/saída |
|---|---|---|---:|---|---|
| A — normal, completo | 38 | Direto | 5,584 s | 2,443 s | 7523/105 |
| B — dia vazio, replay + correção real | 42 | Corrigido | 2,398 s | 2,018 s | 4381/212 |
| C — prioridade praias, replay + correção real | 43 | Corrigido | 2,625 s | 2,245 s | 4624/313 |
| B — confirmação com geração completa | 44 | Corrigido | 5,050 s | 2,076 + 1,790 s | 12400/62 + 4381/212 |
| D — horário variável, replay sem modelo | 45 | Direto | 0,223 s | Nenhum | — |
| E — aceita distância, replay sem modelo | 46 | Direto | 0,286 s | Nenhum | — |

Tempos de replay não representam latência completa de geração. A e B/44 incluem Sheets e geração real; somente B/44 demonstra duas chamadas dentro de uma execução completa. C usa um resultado inicial deliberadamente fraco para testar o detector; a correção é real.

### Antes/depois

- B/44: Dia 2 vazio com 18 candidatos compatíveis disponíveis → Matadeiro e Barra da Lagoa no Dia 2. Mirante do Encanto e Praia da Armação continuam juntos no Dia 1, na mesma ordem e períodos, preservando o pedido de deslocamento longo. A duração do Mirante mudou de 2h para 3h: pequena mudança desnecessária feita pela IA, sem intervenção do código.
- C: uma praia entre cinco visitas → seis praias distribuídas pela IA em três dias. O código não determinou essa quantidade nem a sequência.
- D: Norden pela manhã só tem abertura compatível no fim de semana. Sem data de viagem, passa como incerto, sem inventar dia da semana.
- E: trecho de 74,4 km em linha reta preservado. Distância não virou impedimento.
- As 21 visitas finais dos seis resultados passaram pela recuperação factual, pelo validador original e pelo normalizador real do contrato do frontend; seleção e ordem final do modelo preservadas.

## Observabilidade

Registra aprovação inicial/final, códigos dos motivos/incertezas, uso de correção, tempo da primeira chamada, tempo corretivo, tempo até o gate final e resultado. Os logs próprios não incluem texto livre ou nomes de atrações. A persistência nativa de execuções do n8n continua contendo os dados de execução conforme a configuração existente.

`firstCallElapsedMs` inclui dispatch entre preparação e hidratação; `correctionElapsedMs` inclui dispatch corretivo; `totalMs` vai do início da preparação ao gate final, não até o fim da resposta HTTP. Em fixtures fixadas, esses relógios incluem preparação do teste. A tabela usa timestamps da execução e `executionTime` dos subnodes para evitar essa distorção.

## Testes e limitações

47 testes locais do pipeline/contexto/gate/Code nodes passaram. Verificação de seis respostas/21 locais passou. SDK validado sem avisos. Typecheck e lint passaram.

Houve três falhas de preparação adicionais, documentadas para não confundir com qualidade: #39 transportou uma fixture truncada e falhou antes do modelo; #40/#41 detectaram corretamente a falha, mas a credencial atribuída automaticamente a um novo subnode corretivo retornou 401. Foi removido esse subnode; a versão final compartilha o modelo original e completou os testes #42–46. Foram cinco respostas de modelo bem-sucedidas nesta rodada, além de duas tentativas recusadas por autenticação; não houve bateria adicional nem consumo de créditos do aplicativo.

Nenhum falso positivo nos casos avaliados. Isso não comprova cobertura universal: o detector é conservador e pode deixar passar preferências complexas como “praias tranquilas com bares por perto”. A regra forte de aderência cobre praias, não todas as intenções possíveis. Horários parciais permanecem uma incerteza real sem data de viagem. Falha persistente após correção e IDs/períodos inválidos foram testados localmente, sem gastar novas chamadas.

## Recomendação

Recomendo publicação controlada para o uso acadêmico, após autorização do responsável, acompanhando rejeições e correções. A amostra demonstra os caminhos principais, mas não constitui garantia estatística de qualidade/latência. Não foi publicado.

## Arquivos

Novos: `quality-gate.mjs`, `correction-prompt.txt`, `quality-gate.test.mjs`, `quality-workflow.test.mjs`, `build-quality-fixtures.mjs`, `quality-gate-fixtures.json`, `quality-gate-evidence.json`, `quality-gate-integrity.json`, `verify-quality-gate.mjs`, este relatório.

Atualizados: `build-workflow.mjs`, `workflow.sdk.js`, `update-operations.json`, `tcc-v0.1.draft.json`, `README.md`, `model-config.json`. `update-operations.json` é uma migração desde a arquitetura antiga, não um patch idempotente para reaplicar no rascunho atual.

Nodes novos: Quality gate, Precisa corrigir?, Corrigir roteiro, Reavaliar correção, Finalizar qualidade, Registrar falha da correção. Recuperar locais reais recebeu medição de tempo; modelo existente passou a servir também a correção. Nenhuma alteração de frontend, Edge, créditos, banco ou produção nesta rodada.
