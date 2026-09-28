# Data opcional de início — 21/09/2026

## Estado da entrega

Implementação local de formulário, resultado e Edge concluída. Workflow atualizado somente em rascunho: `a584937f-ce0e-4372-b04e-ed92e0c5a0d4`. Versão publicada preservada: `10a0fdaa-03fc-4d97-b355-36bcf5d34a3d`; grafo ativo, conexões e subnode Gemini comparados e inalterados.

Não houve publicação do workflow, deploy da Edge ou do frontend. Para ativar em produção, publicar primeiro o rascunho compatível, depois a Edge e então o frontend. Nenhuma migration necessária. Não ativar o frontend isoladamente: a Edge antiga descartaria o campo e não o incluiria no hash de idempotência.

## Contrato e cálculo

- Request interno do frontend: `startDate?: string`.
- HTTP frontend → Edge → n8n: `data_inicio?: "YYYY-MM-DD"`.
- Resposta n8n: `dias[].data` opcional, calculada após a IA.
- Resposta normalizada e JSON salvo: `days[].date` opcional.
- Omitir o campo preserva o formato antigo. Valores presentes inválidos, nulos ou timestamps são rejeitados antes de reservar créditos. Dias continuam 1–7.
- `calendar-date.mjs` é compartilhado por frontend, Edge e código embutido no n8n. Valida componentes e anos bissextos. Faz aritmética com UTC fixo e getters UTC, sem interpretar o valor como horário local nem convertê-lo ao fuso do usuário. A data não sofre deslocamento de dia.
- A Edge inclui a data no hash somente quando informada, mantendo o hash antigo sem data; deriva novamente as datas a partir do pedido antes de salvar o resultado da geração.
- Solicitações pendentes conservam `startDate` após reload. Roteiros salvos conservam `days[].date` dentro do JSON existente; datas consecutivas são validadas ao reabrir.

## Interface

Campo date opcional, com label e ajuda, logo abaixo da quantidade de dias. Os chips continuam “Todos”, “Dia 1”, etc. O resumo do dia e os títulos da visão “Todos” mostram, por exemplo, “Dia 1 · Segunda, 16 nov”. Sem data, seguem os labels antigos.

O resultado datado informa que os horários são referências cadastrais e pede confirmação antes da visita, especialmente em feriados. Não há consulta em tempo real.

## Planejamento e quality gate

`calendario_viagem` relaciona cada dia com sua data e dia da semana, segunda=0 até domingo=6. Cada candidato recebe `hd`: uma linha por dia da viagem, com a maior janela contínua cadastrada em minutos para manhã/tarde/noite. Zero significa ausência comprovada de abertura; null significa incerteza. `hp`, contexto geográfico, fatos e horários originais permanecem disponíveis.

Sem data, não são enviados calendário nem `hd`, e a regra agregada anterior continua. Com data, o gate verifica o período no dia da semana correto. Conflitos, ausência e horários parcialmente interpretáveis preservam a incerteza. Também preserva a incerteza de possível funcionamento que atravessa a meia-noite quando o dia anterior não está disponível.

Os candidatos considerados para justificar preencher dias vazios precisam ter possibilidade de abertura nos dias em questão. A regra de distância não mudou. O gate continua sem adicionar/reordenar visitas e permite uma única correção pela IA; o calendário é incluído também no contexto corretivo. Datas produzidas pelo modelo são ignoradas.

Horários semanais não comprovam abertura numa data específica: feriados, exceções e alterações não cadastradas não são inferidos. O gate detecta período inteiramente incompatível, não garante um agendamento exato dentro dele.

## Validação

- 53 testes locais do pipeline, contexto, gate e calendário: aprovados (47 existentes + 6 novos).
- 40 testes existentes do aplicativo e teste novo de datas: aprovados; inclui salvamento/reabertura e recuperação pendente.
- Edge: 1 suíte/12 etapas aprovada com serviços simulados. Datas inválidas não reservam; data chega ao n8n, altera hash e persiste no resultado; autenticação, reembolso e replay mantidos.
- Typecheck, lint e build aprovados. Build mantém aviso de chunks grandes do mapa já existente.
- SDK do workflow validado; atualização de oito nodes sem avisos. Validador original, modelo, credenciais e conexões intactos.
- Testes de data atravessam mês/ano, ano bissexto, sexta→sábado→domingo e três fusos diferentes. Segunda 16/11/2026 gera 16, 17 e 18/11. Norden manhã reprova na segunda, passa no sábado; sem data permanece incerto.
- Caminho corretivo compilado testado offline: manhã incompatível → resposta corrigida pela IA simulada para noite → gate aprovado, data original preservada mesmo com data incorreta na resposta simulada.

### Duas execuções reais, sem créditos do app

Mesmo pedido de três dias no Vale Europeu, gastronomia, “Quero visitar Norden Blumenau.”:

| Execução | Início | Total n8n | Chamadas Gemini | Resultado |
|---|---|---:|---:|---|
| 47 | Segunda, 16/11/2026 | 5,494 s | 1 | Datas 16–18; Norden na segunda à noite; gate aprovado |
| 48 | Sexta, 20/11/2026 | 3,484 s | 1 | Datas 20–22; fim de semana preservado; gate aprovado |

Nenhuma correção necessária nesses dois casos. Os 12 locais finais passaram pela hidratação factual e pelo contrato real do frontend; datas conferidas contra o calendário determinístico. Sem bateria adicional de IA. A geração sem data foi coberta por testes locais e fixtures existentes, sem nova chamada paga.

Não foi possível validar visualmente no browser: a ferramenta informou nenhum navegador conectado. Label do resultado, preservação das datas, typecheck e build foram verificados; a aparência do date picker em mobile/desktop ainda merece conferência manual. Nenhuma regressão detectada nos testes; amostra pequena não elimina possíveis limitações da base.

## Arquivos desta rodada

- Compartilhados: `supabase/functions/_shared/calendar-date.mjs`, `calendar-date.d.mts`, `types.ts`, `itinerary-schema.ts`.
- Edge: `supabase/functions/generate-itinerary/index.ts`, `index.test.ts`.
- Frontend: `src/components/ItineraryForm.tsx`, `ItineraryResults.tsx`, `src/pages/Index.tsx`, `src/features/itinerary/api.ts`, `calendar-date.test.ts`, `src/features/credits/pending.ts`, `pending.test.ts`, `package.json`.
- n8n: `pipeline.mjs`, `planning-context.mjs`, `quality-gate.mjs`, `system-prompt.txt`, `correction-prompt.txt`, `build-workflow.mjs`, `workflow.sdk.js`, `update-operations.json`, `tcc-v0.1.draft.json`, `quality-workflow.test.mjs`, `calendar-date.test.mjs`, `calendar-date-evidence.json`, `verify-calendar-date.mjs`, `README.md`, este relatório.

`update-operations.json` continua uma migração desde o workflow antigo, não deve ser reaplicado ao compacto atual. Nesta rodada o remoto recebeu somente parâmetros dos oito nodes de planejamento/grounding/gate, sem trocar conexões ou credenciais.
