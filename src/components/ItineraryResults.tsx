import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalCard } from "@/components/LocalCard";
import { MapView } from "@/components/MapView";
import { RoteiroCard } from "@/components/RoteiroCard";
import { StatsBar } from "@/components/StatsBar";
import { getMappableLocations, hasValidCoordinates } from "@/features/itinerary/map-utils";
import type { Itinerary } from "@/features/itinerary/types";

interface ItineraryResultsProps {
  itinerary: Itinerary;
  onEditPreferences: () => void;
}

export const ItineraryResults = ({ itinerary, onEditPreferences }: ItineraryResultsProps) => {
  const firstMappableIndex = useMemo(
    () => getMappableLocations(itinerary.locations)[0]?.index ?? null,
    [itinerary.locations],
  );
  const [activeLocationIndex, setActiveLocationIndex] = useState<number | null>(firstMappableIndex);

  useEffect(() => {
    setActiveLocationIndex(firstMappableIndex);
  }, [firstMappableIndex]);

  const selectLocation = (index: number, scrollToMap = false) => {
    setActiveLocationIndex(index);
    if (scrollToMap) {
      document.getElementById("itinerary-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Seu roteiro personalizado</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Pronto para explorar?</h1>
          <p className="mt-2 text-muted-foreground">Confira os locais e selecione um cartão para encontrá-lo no mapa.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11 self-start sm:self-auto" onClick={onEditPreferences}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ajustar preferências
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <RoteiroCard title={itinerary.title} description={itinerary.description} />
        <StatsBar locationsCount={itinerary.locations.length} estimatedTime={itinerary.estimatedTime} />
      </div>

      <section className="mt-10" aria-labelledby="locations-title">
        <div className="mb-5">
          <h2 id="locations-title" className="flex items-center gap-2 text-2xl font-bold"><ListOrdered className="h-6 w-6 text-primary" aria-hidden="true" /> Locais do roteiro</h2>
          <p className="mt-1 text-muted-foreground">A numeração dos cartões é a mesma usada nos marcadores.</p>
        </div>
        {itinerary.days.map((day) => (
          <section key={day.day} className="mt-8" aria-labelledby={`day-${day.day}`}>
            <h3 id={`day-${day.day}`} className="mb-4 text-xl font-bold">Dia {day.day}</h3>
            {day.locations.length === 0 && (
              <p className="text-muted-foreground">Sem locais disponíveis para este dia nas bases selecionadas.</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {day.locations.map((location) => (
            <LocalCard
              key={location.order}
              position={location.order}
              period={location.period}
              estimatedDuration={location.estimatedDuration}
              name={location.name}
              description={location.description}
              hasCoordinates={hasValidCoordinates(location)}
              isActive={activeLocationIndex === location.order - 1}
              onLocationClick={() => selectLocation(location.order - 1, true)}
            />
          ))}
            </div>
          </section>
        ))}
      </section>

      <div id="itinerary-map" className="mt-10 scroll-mt-24">
        <MapView
          locations={itinerary.locations}
          activeLocationIndex={activeLocationIndex}
          onMarkerSelect={(index) => selectLocation(index)}
        />
      </div>
    </main>
  );
};
