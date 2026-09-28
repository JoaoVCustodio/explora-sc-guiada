import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ItineraryForm } from "@/components/ItineraryForm";
import { ItineraryResults } from "@/components/ItineraryResults";
import { SaveItineraryButton } from "@/components/SaveItineraryButton";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { generateItinerary, ItineraryApiError } from "@/features/itinerary/api";
import type { Itinerary, ItineraryRequest } from "@/features/itinerary/types";
import { useAuth } from "@/contexts/auth-context";
import { useCredits, refreshCredits } from "@/features/credits/useCredits";
import { CreditsPanel } from "@/components/CreditsPanel";
import { clearPending, readPending, writePending } from "@/features/credits/pending";
import { isTripStart } from "../../supabase/functions/_shared/calendar-date.mjs";

const Index = () => {
  const { user } = useAuth();
  const creditState = useCredits();
  const [pending, setPending] = useState(() => user ? readPending(user.id) : null);
  const [preferences, setPreferences] = useState(pending?.input.preferences ?? "");
  const [days, setDays] = useState(pending?.input.days ?? 3);
  const [startDate, setStartDate] = useState(pending?.input.startDate ?? "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(pending?.input.interests ?? []);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(pending?.input.regions ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [generationRequest, setGenerationRequest] = useState<ItineraryRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (itinerary) window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [itinerary]);

  const handleGenerateItinerary = async () => {
    if (requestControllerRef.current || !user) return;
    if (!pending && startDate && !isTripStart(startDate, days)) {
      setErrorMessage("Informe uma data de início válida.");
      document.getElementById("trip-start")?.focus();
      return;
    }
    if (!pending && selectedRegions.length === 0) {
      setErrorMessage("Selecione pelo menos uma região de Santa Catarina.");
      document.getElementById("region-selector")?.focus();
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setIsLoading(true);
    setErrorMessage(null);
    const attempt = pending ?? { id: crypto.randomUUID(), input: { preferences, days, interests: selectedInterests, regions: selectedRegions, ...(startDate ? { startDate } : {}) } };

    try {
      try { writePending(user.id, attempt); } catch { throw new ItineraryApiError("definitive", "Ative o armazenamento do navegador para gerar e recuperar seu roteiro com segurança."); }
      setPending(attempt);
      const generatedItinerary = await generateItinerary(
        attempt.input,
        controller.signal,
        attempt.id,
      );
      setItinerary(generatedItinerary);
      setGenerationRequest(attempt.input);
      clearPending(user.id, attempt.id);
      setPending(null);
      toast.success("Roteiro gerado com sucesso.");
    } catch (error) {
      if (error instanceof ItineraryApiError && error.code === "definitive") {
        clearPending(user.id, attempt.id);
        setPending(null);
      }
      setErrorMessage(error instanceof ItineraryApiError ? error.message : "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      refreshCredits();
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const cancelGeneration = () => {
    requestControllerRef.current?.abort();
  };

  const editPreferences = () => {
    setItinerary(null);
    setErrorMessage(null);
  };

  return (
    <div className="product-ui relative min-h-dvh bg-background">
      <TourismBackdrop />
      <Header />

      {isLoading ? (
        <main id="main-content" className="relative z-10 pt-16">
          <LoadingAnimation onCancel={cancelGeneration} />
        </main>
      ) : itinerary ? (
        <div className="relative z-10">
          <ItineraryResults itinerary={itinerary} regions={generationRequest?.regions ?? []} onEditPreferences={editPreferences}
            actions={generationRequest && <SaveItineraryButton itinerary={itinerary} request={generationRequest} />} />
        </div>
      ) : (
        <main id="main-content" className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <ItineraryForm
            creditPanel={<CreditsPanel {...creditState} onRetry={creditState.refresh} />}
            disabled={!pending && (!creditState.credits || creditState.credits.balance === 0 || creditState.credits.pending)}
            pending={Boolean(pending)}
            errorMessage={errorMessage}
            preferences={preferences}
            days={days}
            startDate={startDate}
            onStartDateChange={setStartDate}
            onDaysChange={setDays}
            selectedInterests={selectedInterests}
            selectedRegions={selectedRegions}
            onPreferencesChange={setPreferences}
            onInterestsChange={setSelectedInterests}
            onRegionsChange={(values) => {
              setSelectedRegions(values);
              if (values.length > 0) setErrorMessage(null);
            }}
            onSubmit={handleGenerateItinerary}
          />
        </main>
      )}
    </div>
  );
};

export default Index;
