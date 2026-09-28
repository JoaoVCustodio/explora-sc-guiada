# Autenticação por e-mail do ExploraSC

Projeto hospedado: `qivbamplrsohrrytxzpi`.

## URLs no Supabase hospedado

Em **Authentication > URL Configuration**, definir:

- **Site URL:** `https://explorasc.vercel.app`
- **Redirect URLs:**
  - `https://explorasc.vercel.app/planejar`
  - `https://explorasc.vercel.app/auth?mode=reset`
  - `http://localhost:5173/planejar`
  - `http://localhost:5173/auth?mode=reset`
  - `http://127.0.0.1:5173/planejar`
  - `http://127.0.0.1:5173/auth?mode=reset`

Use entradas exatas, sem `*`. A confirmação de cadastro usa `/planejar`; a
recuperação usa `/auth?mode=reset`. Não é preciso cadastrar a rota de solicitação
`/auth?mode=forgot` como destino de e-mail. Deixe a confirmação de e-mail ativada
em **Authentication > Providers > Email**.

`config.toml` registra o mesmo conjunto para o Supabase local, mas **não altera
automaticamente o projeto hospedado**.
O `vercel.json` precisa entrar no próximo deploy do frontend para que links
diretos de `/planejar` e `/auth?mode=reset` carreguem o app React.

## Templates no Supabase hospedado

Em **Authentication > Email Templates**, copie o HTML e o assunto dos arquivos
abaixo para os campos correspondentes:

| Template no painel | Arquivo | Assunto |
| --- | --- | --- |
| Confirm Signup | `supabase/templates/confirmation.html` | `Confirme seu e-mail \| ExploraSC` |
| Reset Password | `supabase/templates/recovery.html` | `Crie uma nova senha \| ExploraSC` |
| Change Email | `supabase/templates/email_change.html` | `Confirme seu novo e-mail \| ExploraSC` |
| Invite User | `supabase/templates/invite.html` | `Seu convite para o ExploraSC` |

Todos os links usam `{{ .ConfirmationURL }}` gerado pelo Supabase. Não monte URLs
de verificação ou tokens no frontend.

## SMTP Resend

Verifique primeiro no Resend um domínio próprio com acesso ao DNS. A URL
`explorasc.vercel.app` é o endereço do site e não comprova controle do domínio
de envio. Escolha um remetente do domínio verificado, por exemplo
`no-reply@<dominio-verificado>`; o domínio real ainda precisa ser escolhido.

Em **Authentication > SMTP Settings** do projeto Supabase:

| Campo | Valor |
| --- | --- |
| Enable custom SMTP | Ativar somente depois de verificar domínio e inserir a chave |
| Sender email | `no-reply@<dominio-verificado>` |
| Sender name | `ExploraSC` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | **Resend API Key**, inserida somente neste campo do painel Supabase |

Não adicione a chave ao `.env.local`, `VITE_*`, `config.toml`, código ou git.
Depois de salvar, envie um e-mail de teste pelo Supabase e confira a entrega
para uma caixa fora dos membros do projeto.

## Verificação funcional

Em produção e em `http://localhost:5173`, crie uma conta descartável por e-mail,
abra a confirmação e verifique `/planejar`; solicite recuperação, abra o link,
crie uma nova senha, saia e entre com a nova senha. Verifique também que a senha
anterior não autentica. Remova a conta de teste após a verificação.
