import { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { deleteSavedItinerary } from "@/features/itinerary/saved-api";

export const DeleteItineraryButton = ({ id, title, onDeleted }: {
  id: string;
  title: string;
  onDeleted: () => void;
}) => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const remove = async () => {
    if (!user || inFlight.current) return;
    if (!window.confirm(`Excluir o roteiro “${title}”? Esta ação não pode ser desfeita.`)) return;
    inFlight.current = true;
    setDeleting(true);
    setError(null);
    try {
      await deleteSavedItinerary(id, user.id);
      toast.success("Roteiro excluído.");
      onDeleted();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível excluir. Tente novamente.";
      setError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  };

  return (
    <div>
      <Button type="button" variant="outline" className="min-h-11 text-destructive hover:text-destructive"
        disabled={deleting || !user} aria-busy={deleting} aria-label={`Excluir roteiro ${title}`} onClick={() => void remove()}>
        {deleting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
        {deleting ? "Excluindo..." : "Excluir"}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
};
