import { useId, useRef, useState, type FormEvent } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { deleteReview, saveReview } from "@/features/community/api";
import { REVIEW_COMMENT_LIMIT, reviewInputSchema, type Review } from "@/features/community/schema";

export const ReviewForm = ({ itineraryId, ownReview, onChanged }: {
  itineraryId: string; ownReview: Review | null; onChanged: () => void;
}) => {
  const { user } = useAuth();
  const formId = useId();
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [comment, setComment] = useState(ownReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mutate = async (remove: boolean) => {
    if (!user || busy.current) return;
    if (remove && !window.confirm("Remover sua avaliação deste roteiro?")) return;
    if (!remove) {
      const parsed = reviewInputSchema.safeParse({ rating, comment });
      if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    }
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      if (remove) await deleteReview(itineraryId, user.id);
      else await saveReview(itineraryId, user.id, rating, comment, Boolean(ownReview));
      toast.success(remove ? "Avaliação removida." : "Avaliação salva.");
      onChanged();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível atualizar sua avaliação.";
      setError(message);
      toast.error(message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void mutate(false); };
  return (
    <form onSubmit={submit} className="my-6 rounded-2xl border border-border bg-card p-6" aria-busy={loading}>
      <h3 className="text-lg font-semibold">{ownReview ? "Editar minha avaliação" : "Avaliar este roteiro"}</h3>
      <fieldset disabled={loading} className="mt-4" aria-describedby={error ? `${formId}-error` : undefined}>
        <legend className="text-sm font-medium">Sua nota — de 1 a 5 estrelas</legend>
        <div className="mt-2 flex gap-1 sm:gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <label key={score} className="cursor-pointer">
              <input type="radio" name={`${formId}-rating`} value={score} checked={rating === score} onChange={() => setRating(score)} required className="peer sr-only" />
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-50">
                <Star aria-hidden="true" className={`h-6 w-6 ${score <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                <span className="sr-only">{score} {score === 1 ? "estrela" : "estrelas"}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${formId}-comment`} className="mb-2 mt-5 block text-sm font-medium">Comentário (opcional)</label>
      <Textarea id={`${formId}-comment`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={REVIEW_COMMENT_LIMIT} disabled={loading}
        aria-describedby={`${formId}-hint`} rows={3} />
      <p id={`${formId}-hint`} className="mt-2 text-sm text-muted-foreground">{comment.length}/{REVIEW_COMMENT_LIMIT} caracteres. Não inclua e-mail ou outros dados pessoais.</p>
      {error && <p id={`${formId}-error`} role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" className="min-h-11" disabled={loading || !user}>{loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{ownReview ? "Salvar alterações" : "Enviar avaliação"}</Button>
        {ownReview && <Button type="button" variant="outline" className="min-h-11 text-destructive hover:text-destructive" disabled={loading || !user} onClick={() => void mutate(true)}>Remover minha avaliação</Button>}
      </div>
    </form>
  );
};
