import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { updateProfileName } from "@/features/profile/api";
import { DISPLAY_NAME_LIMIT, displayNameInputSchema } from "@/features/profile/schema";
import { useProfile } from "@/features/profile/useProfile";

export default function Account() {
  const { user } = useAuth();
  const { fullName, loading, error: loadError, refresh } = useProfile();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => { setName(fullName ?? ""); }, [fullName]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || busy.current || loading || loadError) return;
    const parsed = displayNameInputSchema.safeParse(name);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await updateProfileName(user.id, parsed.data);
      toast.success("Nome atualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar seu nome. Tente novamente.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="product-ui relative min-h-dvh bg-background">
      <TourismBackdrop /><Header />
      <main id="main-content" className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="page-heading">
          <h1 className="text-3xl sm:text-4xl">Minha conta</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Escolha como seu nome aparece no ExploraSC.</p>
        </div>
        <section className="surface-panel max-w-xl p-5 sm:p-7" aria-labelledby="account-name-title">
          <h2 id="account-name-title" className="text-xl font-semibold">Editar nome</h2>
          <p id="account-name-help" className="mt-2 text-sm leading-relaxed text-muted-foreground">Este nome aparece nos seus roteiros publicados e nas suas avaliações da comunidade, inclusive nas publicações anteriores.</p>
          {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Carregando seu nome...</p> : loadError ? (
            <div className="mt-5"><p role="alert" className="text-sm text-destructive">Não foi possível carregar seu nome.</p><Button type="button" variant="outline" className="mt-3" onClick={refresh}>Tentar novamente</Button></div>
          ) : (
            <form onSubmit={save} className="mt-6" noValidate aria-busy={saving}>
              <Label htmlFor="account-name">Nome de exibição</Label>
              <Input id="account-name" name="name" autoComplete="nickname" value={name} maxLength={DISPLAY_NAME_LIMIT} disabled={saving}
                className="mt-2 min-h-11" aria-invalid={Boolean(error)} aria-describedby={`account-name-help${error ? " account-name-error" : ""}`}
                onChange={(event) => { setName(event.target.value); setError(null); }} />
              {error && <p id="account-name-error" role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="submit" disabled={saving || name.trim() === (fullName ?? "").trim()}>{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? "Salvando..." : "Salvar nome"}</Button>
                <Button asChild variant="outline"><Link to="/planejar">Voltar a Planejar</Link></Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
