# Landing pública do ExploraSC

## Conceito e navegação

Um atlas de viagem: verde floresta, areia, detalhes âmbar, títulos editoriais e cartografia ilustrativa. O conteúdo segue a viagem do interesse ao roteiro, ao mapa e às descobertas compartilhadas. Sem métricas, depoimentos ou parceiros inventados.

- `/`: landing pública, inclusive para quem já está autenticado.
- `/planejar`: planejador existente, com a mesma proteção por autenticação.
- CTA principal: `/auth?mode=signup` para visitantes; `/planejar` para usuários autenticados.
- Login sem destino anterior leva a `/planejar`. O destino protegido anterior continua sendo respeitado.
- `/comunidade`, `/meus-roteiros` e detalhes mantêm seus caminhos e proteções.
- Links de confirmação de cadastro mantêm o destino público já configurado. Após confirmar, o usuário pode abrir o planejador pelo CTA da landing. Não é necessária alteração da allowlist de autenticação.
- Mudanças de pathname reiniciam o scroll; âncoras internas continuam funcionando na mesma página.

Nenhum backend, crédito, geração, banco, mapa do app, OSRM, parceiro ou avaliação foi alterado nesta rodada.

## Estrutura

1. Header público e hero com paisagem, CTA gratuito e filme do produto.
2. Introdução aos diferentes interesses de viagem.
3. Como funciona, em três passos.
4. Demonstração interativa dos dias, com cards, períodos e duração.
5. Cartografia SVG apresentando atrações e trajeto.
6. Salvar, publicar, Comunidade e parceiros locais.
7. Perguntas sobre créditos e planejamento.
8. Convite final com as três gerações gratuitas e rodapé.

## Vídeo e performance

Remotion é usado exclusivamente para produzir arquivos estáticos: 14 segundos, 1280 × 800, 30 fps, sem faixa de áudio. A composição agora reutiliza o formulário, seletores, cards e loading reais do produto. Um cursor seleciona três dias, interesses e região, aciona a geração simulada, navega pelos dias e abre o mapa. Scroll, pins e desenho da rota são controlados por frame. O final retorna ao estado visual inicial. Detalhes em `video/README.md`.

| Asset | Tamanho aproximado |
| --- | ---: |
| WebM / VP9 | 1,52 MB |
| MP4 / H.264 | 1,51 MB |
| Poster desktop / WebP | 49 KB |
| Poster mobile / WebP | 17 KB |
| Paisagem desktop / WebP | 295 KB |
| Paisagem mobile / WebP | 76 KB |

O navegador escolhe WebM ou MP4; não precisa baixar ambos. Vídeo com `autoplay`, `muted`, `loop` e `playsInline`, carregado depois de 400 ms quando movimento é permitido, inclusive no mobile. `saveData` usa imagem estática. Há controle de pausa; sair da área visível ou ocultar a aba pausa o filme. Voltar retoma a reprodução, exceto após pausa manual. Falha de reprodução mantém o poster.

`prefers-reduced-motion` usa imagem, sem baixar o vídeo. O conteúdo essencial também está em HTML. Imagens têm dimensões explícitas; a tela do filme reserva sua proporção antes do carregamento. Não há fontes remotas, parallax ou bibliotecas de animação no runtime.

A landing é carregada por `React.lazy`. No build validado: JS específico de 20,75 KB (6,75 KB gzip), CSS de 15,99 KB (4,06 KB gzip). O chunk da landing não importa Remotion nem MapLibre. O aviso de tamanho do chunk do mapa existente continua presente.

## Produção dos assets

Dependências de desenvolvimento adicionadas: `remotion@4.0.526`, `@remotion/cli@4.0.526` e `sharp@0.35.4`. O build normal usa os assets prontos e não renderiza vídeo. A primeira renderização pode baixar o Chrome Headless Shell usado pelo Remotion.

Execute a partir da raiz:

```powershell
rtk proxy npm run video:assets
rtk proxy npm run video:styles
rtk proxy npm run video:poster
rtk proxy npm run video:assets
rtk proxy npm run video:mp4
rtk proxy npm run video:webm
rtk proxy npm run video:typecheck
```

O CLI do Remotion avisa sobre Zod 3 do aplicativo versus Zod 4 esperado por sua integração de schemas. Esta composição não usa Zod; ambos os renders e o typecheck passaram. A versão de Zod do aplicativo foi preservada. Se forem adicionados schemas de props ao vídeo, isole as dependências do tooling antes de adotar essa integração.

### Origem da paisagem

Gerada com a ferramenta integrada de imagem, sem imagem de referência, e identificada na landing como ilustrativa. Não representa uma praia específica. Original em `video/coast-source.png`; versões responsivas produzidas com Sharp.

Prompt utilizado:

> Create a single premium editorial travel landscape image for the ExploraSC tourism website. Wide panoramic 1536x1024 composition. Photorealistic aerial view inspired by the Atlantic forest coastline of Santa Catarina, southern Brazil: lush deep forest green hills descending into a graceful secluded pale sand crescent bay, jade and teal ocean with delicate white surf, distant hazy headlands, soft late afternoon light. Refined natural color grading, cinematic depth, quiet and sophisticated, tactile forest textures, no oversaturated tropical candy colors. The landscape is illustrative, not a specific named real landmark. No people, no buildings, no boats, no text, no logos, no UI, no watermark. Compose a beautiful sweeping diagonal shoreline with dark green forest at left and bottom and open ocean on right, suitable for landscape and portrait crops.

## Validação realizada

- `npm run typecheck`: passou.
- `npm run video:typecheck`: passou.
- `npm run lint`: passou, sem avisos.
- `npm test`: 40 testes passaram.
- `npm run build`: passou; aviso do chunk grande do mapa existente.
- `git diff --check`: passou.
- Remotion: MP4, WebM e poster renderizados com sucesso.
- FFprobe: codecs, dimensões, 30 fps, 14 segundos e ausência de áudio confirmados em ambos os vídeos.
- Inspeção visual: poster e quadros de preferências e dias extraídos do MP4; arquivos em `video/`.
- Preview HTTP: `/`, `/planejar`, `/auth?mode=signup` e assets retornaram 200 com tipos corretos. Isso verifica a entrega da SPA, não substitui navegação autenticada em browser.
- Auditoria npm: dois avisos nas ferramentas existentes (`@humanfs/node`, moderado; `postcss-selector-parser`, baixo), sem avisos altos/críticos. Não foi feita atualização ampla de dependências nesta rodada.

## Revisão manual pendente

A ferramenta de browser retornou inventário vazio e `Browser is not available: iab`. Portanto não foram medidos LCP/CLS nem executados testes de interação da página ao vivo. Breakpoints, dimensões, overflow, foco, scroll e redução de movimento foram revisados no código; a validação visual em dispositivos continua pendente.

Na prévia local, conferir desktop (1440 px), tablet (768–1024 px) e mobile (320/390 px): hero, header, quebra de títulos, seleção dos dias, FAQ, CTA inferior abrindo o topo da autenticação, retorno ao planejador e Comunidade. Conferir pausa do vídeo, bloqueio de autoplay, redução de movimento, scroll e ausência de deslocamento lateral. Usar Lighthouse/DevTools para medir performance na hospedagem final.

## Arquivos desta rodada

- Novos: `src/pages/Landing.tsx`, `src/pages/landing.css`, `src/components/HeroFilm.tsx`, `src/components/LandingMap.tsx`, `public/landing/*`, `video/*`, `LANDING.md`.
- Ajustados: `src/App.tsx`, `src/pages/Auth.tsx`, `src/pages/MyItineraries.tsx`, `src/components/Header.tsx`, `src/components/PasswordRecovery.tsx`, `index.html`, `package.json`, `package-lock.json`.
- Outros arquivos já modificados no workspace pertencem às rodadas anteriores.
