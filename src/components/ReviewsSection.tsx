import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/ReviewForm";
import { RatingSummary } from "@/components/RatingSummary";
import { useAuth } from "@/contexts/auth-context";
import { getOwnReview, listReviews } from "@/features/community/api";
import type { CommunitySummary, PublicReview, Review } from "@/features/community/schema";

export const ReviewsSection = ({ itinerary, onChanged }: { itinerary: CommunitySummary; onChanged: () => void }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [own, setOwn] = useState<Review | null>(null);
  const [ownReady, setOwnReady] = useState(false);
  const [ownError, setOwnError] = useState<string | null>(null);
  const isOwner = user?.id === itinerary.user_id;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void listReviews(itinerary.id, page, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.items.length === 0 && page > 0) { setPage(page - 1); return; }
      setReviews(result.items);
      setHasMore(result.hasMore);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Não foi possível carregar as avaliações.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [itinerary.id, page, revision]);

  useEffect(() => {
    if (!user || isOwner) return;
    const controller = new AbortController();
    setOwnReady(false);
    setOwnError(null);
    void getOwnReview(itinerary.id, user.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setOwn(result); setOwnReady(true); }
    }).catch(() => {
      if (!controller.signal.aborted) setOwnError("Não foi possível carregar sua avaliação. Tente novamente.");
    });
    return () => controller.abort();
  }, [itinerary.id, user, isOwner, revision]);

  return (
    <section className="mt-10" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="mb-2 text-2xl font-bold">Avaliações</h2>
      <RatingSummary average={itinerary.rating_average} count={itinerary.reviews_count} />
      {isOwner ? <p className="my-5 text-muted-foreground">Você é o autor deste roteiro e não pode avaliá-lo.</p> : ownError ? (
        <div className="my-5"><p role="alert" className="text-destructive">{ownError}</p><Button className="mt-2 min-h-11" variant="outline" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button></div>
      ) : ownReady ? (
        <ReviewForm key={own?.updated_at ?? "new"} itineraryId={itinerary.id} ownReview={own} onChanged={onChanged} />
      ) : <p role="status" className="my-5 text-muted-foreground">Carregando sua avaliação...</p>}
      {loading ? <p role="status" className="py-4 text-muted-foreground">Carregando avaliações...</p> : error ? (
        <div><p role="alert" className="text-destructive">{error}</p><Button className="mt-3 min-h-11" variant="outline" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button></div>
      ) : reviews.length === 0 ? <p className="py-4 text-muted-foreground">Este roteiro ainda não recebeu avaliações.</p> : (
        <>
          <ul className="mt-6 space-y-4">
            {reviews.map((review) => (
              <li key={review.user_id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{review.author_name}{review.user_id === user?.id && " (você)"}</p>
                  <span className="flex items-center gap-1.5 text-sm"><Star aria-hidden="true" className="h-4 w-4 fill-primary text-primary" />{review.rating} de 5 estrelas</span>
                </div>
                {review.comment && <p className="mt-3 whitespace-pre-wrap break-words text-muted-foreground">{review.comment}</p>}
                <p className="mt-3 text-xs text-muted-foreground"><time dateTime={review.updated_at}>{new Date(review.updated_at).toLocaleDateString("pt-BR")}</time></p>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas de avaliações" className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="outline" className="min-h-11" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span>Página {page + 1}</span>
            <Button variant="outline" className="min-h-11" disabled={!hasMore} onClick={() => setPage(page + 1)}>Próxima</Button>
          </nav>
        </>
      )}
    </section>
  );
};
