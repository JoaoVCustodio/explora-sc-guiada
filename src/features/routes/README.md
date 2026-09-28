# MapLibre + MapTiler + OSRM

O mapa recebe os dias normalizados de roteiros novos, salvos e da comunidade.
Não modifica itinerary_data, locais, ordem ou parceiros.

## Integração
useRoadRoutes mantém o cálculo local visível e consulta route-osrm uma vez por
dia com 2–20 coordenadas válidas, na ordem original. A Edge Function autentica via
Supabase getUser, limita entrada a 4 KB e consulta somente router.project-osrm.org,
route/v1/driving, GeoJSON completo, sem otimização. Timeout upstream 12 s, cliente
16 s. Resposta limitada a 4 MB e 50 mil pontos. Erros seguros, sem texto livre,
nomes ou interesses enviados ao provedor.
Contrato oficial: https://project-osrm.org/docs/v5.24.0/api/#route-service

## Cache
Chave versionada e coordenadas ordenadas exatas. Rotas válidas persistem por
7 dias em localStorage: até 30 entradas e 1 milhão de caracteres (~2 MB).
Reabrir no mesmo navegador reutiliza a rota; não compartilha entre dispositivos.
Expiração, limpeza ou quota podem exigir nova chamada. Sem migration.
Só armazena geometria/coordenadas e métricas, não identidade/tokens.
Memória deduplica requisições simultâneas; falhas ficam 60 s apenas em memória.
Chamadas sequenciais, intervalo 1,1 s, sem retry automático.
Edge possui gate 1,1 s por isolate, NÃO um limitador global entre instâncias.
Servidor público é para demonstração, sem SLA: para produção/carga concorrente
use instância própria e controle global de carga.
Política: https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy

## Visualização e fallback
Cada dia independente, inclusive em Todos. Nunca conecta dias nem altera ordem.
Linha contínua: vias OSRM, distância e duração do serviço. Tempo estimado,
sem trânsito em tempo real ou duração das visitas.
Linha tracejada: fallback Haversine a ESTIMATED_SPEED_KMH = 40 km/h.
Totais mistos usam ~ e indicam aproximações, sem fingir precisão viária.
Falha de um dia não elimina rotas dos outros. Coordenadas inválidas preservam
pares consecutivos válidos no cálculo local, sem saltar lacunas.
Dias com zero/um local não fazem chamada externa.
GeoJSON usa layers separadas; filtros por dia não recriam o mapa.
Worker Vite continua ?worker&url + setWorkerUrl. VITE_MAPTILER_KEY permanece.

## Correções localizadas
AttributionControl nativo não compacto, com quebra de linha e largura limitada ao
mapa. Removido override 32 px do botão, incompatível com layout compacto de 24 px.
Créditos MapTiler/OpenStreetMap preservados, controles no topo.
Menu da conta: modal=false. O Radix modal padrão ativa RemoveScroll e esconde
scrollbar global. Sem hacks em overflow de html/body ou fullscreen.
Validação visual pendente: navegador indisponível no ambiente de implementação.

## Configuração e testes
Deploy: npx supabase functions deploy route-osrm --project-ref qivbamplrsohrrytxzpi --use-api
Sem API key OSRM nem migration. ALLOWED_ORIGINS opcional segue outras funções.
Gateway JWT permanece habilitado; getUser valida sessão na função.
npm run typecheck; npm test; npm run lint; npm run build.
npx deno check supabase/functions/route-osrm/index.ts.
Testes: contrato OSRM, ordem, cache/expiração/corrupção, fallback independente,
totais mistos, Haversine, lacunas e não conexão entre dias.
