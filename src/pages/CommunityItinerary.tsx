import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { ItineraryResults } from "@/components/ItineraryResults";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { RatingSummary } from "@/components/RatingSummary";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Button } from "@/components/ui/button";
import { getCommunityItinerary } from "@/features/community/api";
import { useAuth } from "@/contexts/auth-context";

const CommunityItinerary = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof getCommunityItinerary>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError(null);
    void getCommunityItinerary(id, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Não foi possível abrir este roteiro. Tente novamente.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision, user?.id]);
  return (
    <div className="relative min-h-dvh bg-background">
      <TourismBackdrop /><Header />
      <div className="relative z-10">
        {!loading && !error && data ? (
          <ItineraryResults itinerary={data.itinerary} backLabel="Comunidade" onEditPreferences={() => navigate("/comunidade")}
            actions={data.user_id === user?.id && <Button asChild variant="outline" className="min-h-11"><Link to={`/meus-roteiros/${data.id}`}>Gerenciar publicação</Link></Button>}
            details={<div className="space-y-2"><p className="break-words text-muted-foreground">Por {data.author_name} · Publicado em <time dateTime={data.published_at}>{new Date(data.published_at).toLocaleDateString("pt-BR")}</time></p><RatingSummary average={data.rating_average} count={data.reviews_count} /></div>}>
            <ReviewsSection key={`${data.id}:${user?.id}:${revision}`} itinerary={data} onChanged={() => setRevision((value) => value + 1)} />
          </ItineraryResults>
        ) : (
          <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-3xl font-bold">Roteiro da comunidade</h1>
            {loading ? <LoadingAnimation compact message="Abrindo roteiro..." /> : (
              <div className="rounded-xl border border-border bg-card p-6"><p role={error ? "alert" : "status"}>{error ?? "Este roteiro não está disponível na comunidade. Ele pode ter sido retirado pelo autor."}</p><div className="mt-4 flex flex-wrap gap-3"><Button asChild variant="outline" className="min-h-11"><Link to="/comunidade">Voltar à comunidade</Link></Button>{error && <Button className="min-h-11" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>}</div></div>
            )}
          </main>
        )}
      </div>
    </div>
  );
};
export default CommunityItinerary;
