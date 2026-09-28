# Demonstração real do hero

Composição `ExploraHero`: 420 frames, 30 fps, 14 s, 1280 × 800. Nenhum áudio.

## Jornada

| Tempo | Ação |
| --- | --- |
| 0–2 s | Planejador real, cursor e seleção de 3 dias |
| 2–4 s | Scroll, seleção de Praias e natureza, Gastronomia e Grande Florianópolis |
| 4–5 s | Scroll ao botão real “Gerar meu roteiro · 1 crédito” e clique |
| 5–6 s | Loading real com duração abreviada |
| 6–7,5 s | Resultado, resumo do roteiro, estatísticas e cards |
| 7,5–9,8 s | Chips Dia 2, Dia 3, Dia 1; entrada dos cards e “Ver no mapa” |
| 9,8–12,5 s | Scroll ao mapa, marcadores e rota desenhada |
| 12,5–14 s | Visão pronta, leve zoom e retorno ao início para o loop |

## Fidelidade e isolamento

Importados sem modificar os componentes do app: `ItineraryForm`, `InterestsMultiSelect`, `RegionsMultiSelect`, `MultiSelectField`, `LocalCard`, `RoteiroCard`, `StatsBar`, `LoadingAnimation`, `Button` e seus componentes básicos. Tailwind compila os tokens e estilos de `src/index.css` para `video/app.css`; o vídeo também usa `src/components/map.css`.

O header e a estrutura de resultado reproduzem as classes e textos de `Header` e `ItineraryResults`. Não são importados os wrappers ligados à autenticação, créditos ou parceiros. O mapa reproduz a apresentação de `MapView` com SVG local, incluindo controles, chips, marcadores e resumo. A base, os pontos, a rota e as estimativas são demonstrativos e identificados no vídeo. Não é uma captura de tiles externos nem um cálculo de trajeto real.

Todas as preferências, atrações, cores e geometrias vêm de arquivos locais. Callbacks do formulário/cards são vazios; a timeline define os estados. Não há uso de Supabase, IA, n8n, OSRM, tiles, fontes remotas ou consumo de créditos. A mudança visual de 3 para 2 créditos é somente parte da demonstração. O loading usa uma mensagem fixa e a rotação é calculada por frame; não depende de relógio, timers ou aleatoriedade.

## Reproduzir

Na raiz do projeto:

```powershell
rtk proxy npm run video:styles
rtk proxy npm run video:poster
rtk proxy npm run video:assets
rtk proxy npm run video:mp4
rtk proxy npm run video:webm
rtk proxy npm run video:typecheck
```

O CLI pode avisar sobre a integração opcional com Zod 4. A composição não usa schemas Zod; a versão 3 utilizada pelo app foi preservada. Renders e typecheck passam.

## Entrega e verificação

- `explorasc-hero.webm`: VP9, 1.521.165 bytes.
- `explorasc-hero.mp4`: H.264, 1.508.671 bytes.
- `hero-poster.webp`: 49.092 bytes.
- `hero-poster-mobile.webp`: 17.286 bytes.
- Ambos os vídeos: 14 s, 1280 × 800, 30 fps, apenas faixa de vídeo, verificados com FFprobe.
- Quadros do render e do MP4 inspecionados para formulário, seleção, botão, resultado, cards e mapa. Cursor calibrado sobre os controles.
- Typechecks do app/vídeo, lint, 40 testes e build passaram. Continua o aviso existente de tamanho do chunk do mapa do aplicativo.
- O player do hero agora também reproduz no mobile, retoma ao retornar à área visível e preserva pausa manual. Mantém poster para movimento reduzido, economia de dados e falhas. O restante da landing não foi alterado.
- A reprodução dentro da página em um browser real não foi validada nesta rodada; a ferramenta estava indisponível na sessão.

## Arquivos desta atualização

`video/index.tsx`, `video/ProductDemo.tsx`, `video/OfflineMap.tsx`, `video/demo-data.ts`, `video/film.css`, `video/app.css`, `video/tailwind.config.ts`, `video/tsconfig.json`, `video/hero-poster.jpg`, quadros de referência em `video/`, `remotion.config.ts`, `src/components/HeroFilm.tsx`, `package.json`, os quatro assets acima em `public/landing/`, `LANDING.md` e este documento. Nenhuma dependência nova.
