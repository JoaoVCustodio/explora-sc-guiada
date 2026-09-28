# Refinamento do sistema autenticado

## Direção visual

A landing foi usada como referência para a combinação de verde floresta, areia, títulos em Georgia e superfícies tranquilas. A interface mantém sans-serif em controles, dados, cards de atrações e textos funcionais. Não foram adicionadas fontes, imagens ou bibliotecas.

O tema está isolado em `.product-ui`, em `src/product.css`, para não modificar a landing. Tokens centralizam paleta semântica, tipografia editorial, radius e sombra. Classes reutilizáveis cobrem títulos, cabeçalhos, cards de coleção, feedback, empty states, escolhas, navegação por dia, estatísticas e avaliações. Componentes compartilhados conservam seus contratos.

## Telas e experiência

- Planejador: composição em duas colunas no desktop (introdução editorial + formulário), uma coluna até tablet. Fundo sem montanhas decorativas ou grade, formulário sem sombra pesada.
- Header: Planejar, Meus roteiros e Comunidade ficam visíveis, com indicação da rota ativa. No mobile/tablet, navegação em uma segunda linha; conteúdo e âncora do mapa reservam o espaço correspondente. Conta e saldo continuam acessíveis.
- Resultado/detalhes salvo e público: resumo com fundo verde profundo, estatísticas mais leves, seções editoriais, chips discretos e cards de atrações com hierarquia e seleção claras. Ordem e ações preservadas.
- Meus roteiros/Comunidade: linguagem comum de cards, metadados secundários, títulos editoriais, empty/error states consistentes. Paginação continua após o conteúdo e escondida quando há só uma página.
- Parceiros e avaliações: superfícies coerentes, avaliações em lista mais leve e controles de nota com foco e seleção visíveis. Consultas, envio e regras intactos.
- Créditos: mesma identidade no dialog/sheet e menu da conta. Nenhuma alteração de saldo, pacotes ou regras.
- Loading: emblema mais suave, sem halo pulsante, texto com espaço reservado; animações respeitam reduced-motion.
- Exclusão: botão visualmente secundário; confirmação funcional existente mantida. As confirmações nativas de exclusão/publicação/remoção de avaliação não foram reimplementadas nesta rodada.

## Calendário

`TripDatePicker` substitui o controle date nativo por um trigger e calendário em dialog nativo, com aparência de popover no desktop e painel compacto no mobile. O dialog mantém contenção nativa de foco, Escape e retorno ao campo. A seleção continua entregando somente `YYYY-MM-DD` ou string vazia ao callback existente.

- Mês/ano e navegação com Lucide; grade de seis semanas para estabilidade.
- Estado selecionado, hoje, dias adjacentes, hover e foco distintos.
- Setas navegam entre dias; Home/End entre extremos da semana; Page Up/Down entre meses; Shift + Page Up/Down entre anos; Enter seleciona.
- Entrada manual DD/MM/AAAA com validação local e botão Aplicar, além de Hoje e Deixar em aberto.
- Data opcional, sem novas regras de planejamento, sem mudança de contrato ou cálculo no backend.
- Usa o gutter estável já existente durante o bloqueio de scroll do dialog; sem compensações de largura ou alterações de overflow no mapa.

## Mapa: somente aparência

Mudanças restritas a `src/components/map.css` e tokens visuais herdados: contorno, título, chips, controles, marcadores e popups. `MapView.tsx` foi comparado por SHA-256 antes/depois e permaneceu idêntico (`C15E386EBE45C16B3CBB316A0D45801032ECB722F2A1B8056DE2D3D4C959C290`). Nenhum evento, cálculo, flyTo, seleção, fullscreen, sincronização ou integração foi alterado.

Também permaneceram idênticos os arquivos de API de geração, Edge generate-itinerary e workflow n8n. Nenhum backend, banco, autenticação, persistência ou contrato alterado nesta rodada.

## Arquivos principais

- Tema: `src/product.css`, import em `src/main.tsx`.
- Calendário: `src/components/TripDatePicker.tsx`, `calendar-utils.ts`, `calendar-utils.test.ts`.
- Formulário/navegação: `Header.tsx`, `ItineraryForm.tsx`, `MultiSelectField.tsx`, `ui/button.tsx`.
- Resultados: `ItineraryResults.tsx`, `LocalCard.tsx`, `RoteiroCard.tsx`, `StatsBar.tsx`, `map.css`.
- Complementos: `PartnersSection.tsx`, `ReviewsSection.tsx`, `ReviewForm.tsx`, `CreditsDialog.tsx`, `LoadingAnimation.tsx`, `ListPagination.tsx`, `DeleteItineraryButton.tsx`.
- Páginas: `Index.tsx`, `MyItineraries.tsx`, `SavedItinerary.tsx`, `Community.tsx`, `CommunityItinerary.tsx`.

## Validação

- Typecheck: aprovado.
- Lint: aprovado.
- Build: aprovado; permanece aviso existente de bundle grande do MapLibre. Nenhuma dependência adicionada.
- Testes frontend: 41 aprovados.
- Dois testes novos do calendário: grade/ano bissexto e navegação mês/ano sem saltos indevidos; aprovados. Teste existente de datas também passou.
- Não executada bateria de backend/n8n.

Não havia navegador conectado (inventário vazio), portanto não houve revisão visual real em desktop/mobile. Antes de publicar, conferir: abertura/fechamento/foco do calendário em Chrome/Safari mobile; teclado e leitor de tela; altura do header e âncora do mapa; cards com títulos muito longos; menu e sheet de créditos; estados vazios/erro; scroll e larguras em 320, 375, 768, 1024 e 1440px. As verificações de código e build não substituem essas conferências.
