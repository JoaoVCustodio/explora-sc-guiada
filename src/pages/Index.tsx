import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ItineraryForm } from "@/components/ItineraryForm";
import { ItineraryResults } from "@/components/ItineraryResults";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { TourismBackdrop } from "@/components/TourismBackdrop";
import { generateItinerary, ItineraryApiError } from "@/features/itinerary/api";
import type { Itinerary } from "@/features/itinerary/types";

const Index = () => {
  const [preferences, setPreferences] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (itinerary) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [itinerary]);

  const handleGenerateItinerary = async () => {
    if (selectedRegions.length === 0) {
      setErrorMessage("Selecione pelo menos uma região de Santa Catarina.");
      document.getElementById("region-selector")?.focus();
      return;
    }

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const generatedItinerary = await generateItinerary(
        {
          preferences,
          interests: selectedInterests,
          regions: selectedRegions,
        },
        controller.signal,
      );
      setItinerary(generatedItinerary);
      toast.success("Roteiro gerado com sucesso.");
    } catch (error) {
      if (error instanceof ItineraryApiError && error.code === "cancelled") {
        toast.info("Geração cancelada.");
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado. Tente novamente.",
        );
      }
    } finally {
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
    <div className="relative min-h-dvh bg-background">
      <TourismBackdrop />
      <Header />

      {isLoading ? (
        <main id="main-content" className="relative z-10 pt-16">
          <LoadingAnimation onCancel={cancelGeneration} />
        </main>
      ) : itinerary ? (
        <div className="relative z-10">
          <ItineraryResults itinerary={itinerary} onEditPreferences={editPreferences} />
        </div>
      ) : (
        <main id="main-content" className="relative z-10 flex min-h-dvh items-center px-4 pb-12 pt-24 sm:px-6 lg:px-8">
          <ItineraryForm
            errorMessage={errorMessage}
            preferences={preferences}
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
