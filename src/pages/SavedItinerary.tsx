import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { ItineraryResults } from "@/components/ItineraryResults";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { DeleteItineraryButton } from "@/components/DeleteItineraryButton";
import { PublicationButton } from "@/components/PublicationButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getSavedItinerary } from "@/features/itinerary/saved-api";

const SavedItinerary = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<Awaited<ReturnType<typeof getSavedItinerary>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true);
    setSaved(null);
    setError(null);
    void getSavedItinerary(id, user.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) setSaved(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Não foi possível abrir este roteiro. Tente novamente.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, user, revision]);

  return (
    <div className="relative min-h-dvh bg-background">
      <TourismBackdrop />
      <Header />
      <div className="relative z-10">
        {!loading && !error && saved ? (
          <ItineraryResults key={saved.id} itinerary={saved.itinerary}
            backLabel="Meus roteiros" onEditPreferences={() => navigate("/meus-roteiros")}
            details={<p className="text-sm text-muted-foreground">{saved.is_public ? <>Publicado na comunidade. <Link className="text-primary underline" to={`/comunidade/${saved.id}`}>Ver publicação e avaliações</Link></> : "Roteiro privado: somente você pode vê-lo."}</p>}
            actions={<>
              <PublicationButton id={saved.id} isPublic={saved.is_public} onChanged={(publication) => setSaved((current) => current ? { ...current, ...publication } : null)} />
              <DeleteItineraryButton id={saved.id} title={saved.title} onDeleted={() => navigate("/meus-roteiros", { replace: true })} />
            </>} />
        ) : (
          <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-3xl font-bold">Roteiro salvo</h1>
            {loading ? <LoadingAnimation compact message="Abrindo seu roteiro..." /> : (
              <div className="rounded-xl border border-border bg-card p-6">
                <p role={error ? "alert" : "status"}>{error ?? "Roteiro não encontrado ou indisponível para esta conta."}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild variant="outline" className="min-h-11"><Link to="/meus-roteiros">Voltar para Meus roteiros</Link></Button>
                  {error && <Button className="min-h-11" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>}
                </div>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
};

export default SavedItinerary;
