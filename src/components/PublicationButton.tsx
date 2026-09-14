import { useRef, useState } from "react";
import { Globe, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getPublicName, setItineraryPublication } from "@/features/community/api";

export const PublicationButton = ({ id, isPublic, onChanged }: {
  id: string; isPublic: boolean;
  onChanged: (publication: { is_public: boolean; published_at: string | null }) => void;
}) => {
  const { user } = useAuth();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = async () => {
    if (!user || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      if (!isPublic) {
        const name = await getPublicName(user.id, new AbortController().signal);
        if (!window.confirm(`Publicar este roteiro como “${name}”? Outros usuários autenticados poderão ver o roteiro completo e avaliá-lo. Seu e-mail não será exibido.`)) return;
      }
      const result = await setItineraryPublication(id, user.id, !isPublic);
      onChanged(result);
      toast.success(result.is_public ? "Roteiro publicado na comunidade." : "Roteiro retirado da comunidade. Ele continua em Meus roteiros.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível alterar a publicação.";
      setError(message);
      toast.error(message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  return (
    <div className="max-w-sm">
      <Button className="min-h-11" variant={isPublic ? "outline" : "default"} disabled={loading || !user} aria-busy={loading} onClick={() => void toggle()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : isPublic ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Globe className="h-4 w-4" aria-hidden="true" />}
        {loading ? "Atualizando..." : isPublic ? "Retirar da comunidade" : "Publicar na comunidade"}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
};
