import { ListPagination } from "@/components/ListPagination";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { Header } from "@/components/Header";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { CommunityCard } from "@/components/CommunityCard";
import { Button } from "@/components/ui/button";
import { listCommunityItineraries } from "@/features/community/api";
import type { CommunitySummary } from "@/features/community/schema";
import { useAuth } from "@/contexts/auth-context";

const Community = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void listCommunityItineraries(page, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.items.length === 0 && page > 0) { setPage(page - 1); return; }
      setItems(result.items);
      setHasMore(result.hasMore);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Não foi possível carregar a comunidade. Tente novamente.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision, user?.id]);
  return (
    <div className="product-ui relative min-h-dvh bg-background">
      <TourismBackdrop /><Header />
      <main id="main-content" className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="page-heading mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="eyebrow">Inspire sua próxima viagem</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Comunidade de roteiros</h1><p className="mt-2 text-muted-foreground">Roteiros compartilhados por outros viajantes, do mais recente para o mais antigo.</p></div>
          <Button asChild variant="outline" className="min-h-11"><Link to="/meus-roteiros">Meus roteiros</Link></Button>
        </div>
        {loading ? <LoadingAnimation compact message="Carregando a comunidade..." /> : error ? (
          <div className="feedback-panel"><p role="alert" className="text-destructive">{error}</p><Button className="mt-4 min-h-11" variant="outline" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button></div>
        ) : items.length === 0 ? (
          <section className="empty-state"><Globe aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-primary" /><h2 className="text-xl font-semibold">Nenhum roteiro publicado ainda</h2><p className="mt-2 text-muted-foreground">Abra um roteiro em Meus roteiros para compartilhá-lo com a comunidade.</p></section>
        ) : (
          <>
            <ul className="grid items-stretch gap-5 md:auto-rows-fr md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <CommunityCard key={item.id} item={item} isOwner={item.user_id === user?.id} />
              ))}
            </ul>
            <ListPagination page={page} hasMore={hasMore} onPageChange={setPage} label="Páginas da comunidade" />
          </>
        )}
      </main>
    </div>
  );
};
export default Community;
