# Cadastro de parceiros

No Supabase do ExploraSC, abra **Table Editor → public.partners → Insert row**.
Não há cadastro nem edição no frontend. Nenhuma empresa foi inserida pela migration.

| Campo | Preenchimento |
|---|---|
| name | Nome autorizado do estabelecimento, até 120 caracteres |
| description | Descrição de 1–300 caracteres |
| region | Uma das sete regiões abaixo, exatamente como escrita |
| city | Cidade, até 120 caracteres |
| neighborhood | Bairro opcional; deixe NULL se ausente |
| image_url | URL HTTPS pública de imagem autorizada; opcional, com ícone substituto |
| whatsapp_url | Opcional: `https://wa.me/55DDDNUMERO` (substitua pelo número real); também aceita api.whatsapp.com e www.whatsapp.com |
| instagram_url | Opcional: `https://www.instagram.com/PERFIL/` (substitua pelo perfil autorizado) |
| active | true para aparecer, false para ocultar |
| is_demo | false para parceiro real; true para demonstração |
| id / created_at | Deixe os valores padrão automáticos |

Regiões: Grande Florianópolis; Serra Catarinense; Litoral Norte; Vale Europeu;
Oeste Catarinense; Sul Catarinense; Planalto Norte.

**Real:** use os dados fornecidos/autorizados pela empresa, `is_demo=false`. Cadastre
inicialmente com `active=false` se precisar revisar antes de divulgar; ative após revisão.

**Demonstrativo:** use um nome explicitamente fictício, como “Parceiro demonstrativo”,
descrição que informe a demonstração e `is_demo=true`. Não associe contatos de empresas
reais sem autorização. Links e imagem podem ficar NULL. `active=true` exibe o card com
o selo “Conteúdo demonstrativo”. O campo is_demo nunca é inferido automaticamente.

Pode cadastrar 2–3 parceiros por região. A aplicação consulta até três ativos de cada
região do roteiro, ordenados por criação e ID, e alterna as regiões até preencher três
cards. Com mais de três regiões com parceiros, prevalecem as primeiras regiões na
ordem do roteiro. Não há ranking, interesses, plano ou pagamento na seleção.

Alterações aparecem na próxima abertura/recarregamento do roteiro; não há atualização
em tempo real. Os parceiros nunca são gravados no JSON do roteiro nem no mapa.
Sem parceiros ativos (ou se a consulta falhar), a seção fica oculta e o roteiro continua acessível.

Teste de banco: `supabase/tests/partners_rls.sql`, executado como postgres, usa fixtures
temporárias e ROLLBACK. Não executar só trechos isolados do teste.
