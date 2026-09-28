import { ListPagination } from "@/components/ListPagination";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Bookmark, CalendarDays, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { DeleteItineraryButton } from "@/components/DeleteItineraryButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { listSavedItineraries } from "@/features/itinerary/saved-api";
import type { SavedItinerarySummary } from "@/features/itinerary/saved-schema";

const MyItineraries = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<SavedItinerarySummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setItems([]);
    void listSavedItineraries(user.id, page, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.items.length === 0 && page > 0) { setPage(page - 1); return; }
      setItems(result.items);
      setHasMore(result.hasMore);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Não foi possível carregar seus roteiros. Tente novamente.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [user, page, revision]);

  return (
    <div className="product-ui relative min-h-dvh bg-background">
      <TourismBackdrop />
      <Header />
      <main id="main-content" className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="page-heading mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Sua próxima viagem começa aqui</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Meus roteiros</h1>
            <p className="mt-2 text-muted-foreground">Seus roteiros salvos, do mais recente para o mais antigo.</p>
          </div>
          <Button asChild className="min-h-11"><Link to="/planejar">Gerar novo roteiro</Link></Button>
        </div>
        {loading ? <LoadingAnimation compact message="Carregando seus roteiros..." /> : error ? (
          <div className="feedback-panel">
            <p role="alert" className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <section className="empty-state">
            <Bookmark className="mx-auto mb-4 h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Você ainda não salvou nenhum roteiro</h2>
            <p className="mt-2 text-muted-foreground">Gere um roteiro e escolha “Salvar roteiro” para encontrá-lo aqui depois.</p>
          </section>
        ) : (
          <>
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="collection-card">
                  <div className="mb-4 flex items-center gap-2 text-xs font-medium text-primary"><Bookmark className="h-4 w-4" aria-hidden="true" />Sua coleção</div>
                  <h2 className="break-words text-xl font-semibold leading-snug tracking-tight">{item.title}</h2>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{item.days_count} {item.days_count === 1 ? "dia" : "dias"}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{item.locationsCount} {item.locationsCount === 1 ? "local" : "locais"}</span>
                  </div>
                  <p className="mb-6 mt-3 text-sm text-muted-foreground">Salvo em <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</time></p>
                  <div className="mt-auto flex flex-wrap gap-3">
                    <Button asChild className="min-h-11 rounded-xl"><Link to={`/meus-roteiros/${item.id}`} aria-label={`Abrir roteiro ${item.title}`}>Abrir roteiro<ArrowUpRight aria-hidden="true" /></Link></Button>
                    <DeleteItineraryButton id={item.id} title={item.title} onDeleted={() => setRevision((value) => value + 1)} />
                  </div>
                </li>
              ))}
            </ul>
            <ListPagination page={page} hasMore={hasMore} onPageChange={setPage} label="Páginas de roteiros" />
          </>
        )}
      </main>
    </div>
  );
};

export default MyItineraries;
