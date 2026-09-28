import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { hasRecoveryCallbackError } from "@/features/auth/recovery-callback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordRecovery({ reset }: { reset: boolean }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (reset && (password.length < 8 || password.length > 72 || password !== data.get("confirm"))) {
      setError("Use de 8 a 72 caracteres e confirme a mesma senha."); return;
    }
    busy.current = true; setPending(true); setError(null);
    try {
      const result = reset
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(String(data.get("email")).trim(), { redirectTo: `${window.location.origin}/auth?mode=reset` });
      if (result.error) throw result.error;
      setSent(true);
      if (reset) {
        // Clear the recovery URL so a reload cannot reuse its credentials.
        navigate("/auth?mode=reset&done=1", { replace: true });
      }
    } catch {
      setError(reset ? "Não foi possível atualizar a senha. Solicite um novo link e tente novamente." : "Não foi possível enviar o link agora. Aguarde alguns minutos e tente novamente.");
    } finally { busy.current = false; setPending(false); }
  };
  const invalid = reset && !loading && (!session || hasRecoveryCallbackError(window.location.href));
  return <main id="main-content" className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-8">
    <section className="surface-panel w-full space-y-5 p-6">
      <h1 className="text-2xl font-bold">{reset ? "Criar nova senha" : "Recuperar senha"}</h1>
      {loading ? <p role="status">Verificando acesso…</p> : sent ? <>
        <p role="status">{reset ? "Senha atualizada com sucesso." : "Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha. Confira também o spam."}</p>
        <Button asChild className="min-h-11"><Link to={reset ? "/planejar" : "/auth"}>{reset ? "Continuar" : "Voltar para entrar"}</Link></Button>
      </> : invalid ? <><p role="alert">O link é inválido ou expirou. Solicite outro para continuar.</p><Button asChild><Link to="/auth?mode=forgot">Solicitar novo link</Link></Button></> : <form onSubmit={submit} className="space-y-4">
        {reset ? <>
          <div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Confirmar nova senha</Label><Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></div>
        </> : <div className="space-y-2"><Label htmlFor="recovery-email">E-mail da conta</Label><Input id="recovery-email" name="email" type="email" autoComplete="email" required /></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="min-h-11 w-full">{pending ? "Aguarde…" : reset ? "Salvar nova senha" : "Enviar link de recuperação"}</Button>
        <Link className="inline-block py-2 text-sm text-primary underline" to="/auth">Voltar para entrar</Link>
      </form>}
    </section>
  </main>;
}
