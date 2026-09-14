import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkPlus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { saveItinerary } from "@/features/itinerary/saved-api";
import type { Itinerary, ItineraryRequest } from "@/features/itinerary/types";

interface Props {
  itinerary: Itinerary;
  request: Pick<ItineraryRequest, "days" | "regions" | "interests">;
}

export const SaveItineraryButton = ({ itinerary, request }: Props) => {
  const { user } = useAuth();
  const [id] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const save = async () => {
    if (!user || inFlight.current || saved) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveItinerary(id, user.id, itinerary, request);
      setSaved(true);
      toast.success("Roteiro salvo em Meus roteiros.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente.";
      setError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="max-w-sm">
      {saved ? (
        <Button asChild className="min-h-11">
          <Link to={`/meus-roteiros/${id}`}><Check aria-hidden="true" className="h-4 w-4" /> Roteiro salvo — abrir</Link>
        </Button>
      ) : (
        <Button type="button" className="min-h-11" disabled={saving || !user} onClick={() => void save()} aria-busy={saving}>
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <BookmarkPlus aria-hidden="true" className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar roteiro"}
        </Button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
};
