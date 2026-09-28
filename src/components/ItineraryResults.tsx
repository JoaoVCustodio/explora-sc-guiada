import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ListOrdered, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalCard } from "@/components/LocalCard";
import { RoteiroCard } from "@/components/RoteiroCard";
import { StatsBar } from "@/components/StatsBar";
import { PartnersSection } from "@/components/PartnersSection";
import { getMappableLocations, hasValidCoordinates } from "@/features/itinerary/map-utils";
import { optionalMediaFields } from "@/features/media/card-images";
import type { Itinerary } from "@/features/itinerary/types";
import { itineraryDayLabel } from "../../supabase/functions/_shared/calendar-date.mjs";

const MapView = lazy(() => import("@/components/MapView").then((module) => ({ default: module.MapView })));

interface ItineraryResultsProps {
  itinerary: Itinerary;
  regions: readonly string[];
  onEditPreferences: () => void;
  backLabel?: string;
  actions?: ReactNode;
  details?: ReactNode;
  children?: ReactNode;
}

export const ItineraryResults = ({ itinerary, regions, onEditPreferences, backLabel = "Ajustar preferências", actions, details, children }: ItineraryResultsProps) => {
  const firstMappableIndex = useMemo(
    () => getMappableLocations(itinerary.locations)[0]?.index ?? null,
    [itinerary.locations],
  );
  const [activeLocationIndex, setActiveLocationIndex] = useState<number | null>(firstMappableIndex);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(itinerary.days[0]?.day ?? 1);
  const visibleDays = itinerary.days.filter(day => day.day === selectedDay);
  const visibleCount = visibleDays.reduce((total, day) => total + day.locations.length, 0);
  const dayLabel = (number: number) => itineraryDayLabel(number, itinerary.days.find(day => day.day === number)?.date);

  useEffect(() => {
    setActiveLocationIndex(firstMappableIndex);
    setSelectedDay(itinerary.days[0]?.day ?? 1);
  }, [firstMappableIndex, itinerary]);

  const selectLocation = (index: number, scrollToMap = false) => {
    setSelectionRevision((value) => value + 1);
    setActiveLocationIndex(index);
    if (scrollToMap) {
      document.getElementById("itinerary-map")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="page-heading mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Seu roteiro personalizado</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Pronto para explorar?</h1>
          <p className="mt-2 text-muted-foreground">Confira os locais e selecione um cartão para encontrá-lo no mapa.</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Button asChild variant="outline" className="min-h-11"><a href="#itinerary-map"><MapPin className="h-4 w-4" aria-hidden="true" />Ver mapa</a></Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={onEditPreferences}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
          </Button>
          {actions}
        </div>
      </div>

      {details && <div className="mb-6">{details}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <RoteiroCard title={itinerary.title} description={itinerary.description} />
        <StatsBar locationsCount={itinerary.locations.length} estimatedTime={itinerary.estimatedTime} />
      </div>

      <section className="mt-10" aria-labelledby="locations-title">
        <div className="mb-5">
          <h2 id="locations-title" className="section-title flex items-center gap-2 text-2xl font-bold"><ListOrdered className="h-6 w-6 text-primary" aria-hidden="true" /> Locais do roteiro</h2>
          <p className="mt-1 text-muted-foreground">A numeração dos cartões é a mesma usada nos marcadores.</p>
        </div>
        <div className="day-navigation flex max-w-full gap-2 overflow-x-auto pb-3" role="group" aria-label="Filtrar atrações por dia">
          {itinerary.days.map(day => <Button key={day.day} type="button" variant={selectedDay === day.day ? 'default' : 'outline'} aria-pressed={selectedDay === day.day} aria-controls="day-locations" onClick={() => setSelectedDay(day.day)} className={`min-h-11 shrink-0 rounded-full px-5 ${selectedDay === day.day ? 'shadow-sm' : 'border-border/80 bg-card text-muted-foreground'}`}>Dia {day.day}</Button>)}
        </div>
        <p className="mb-5 mt-2 text-sm text-muted-foreground" role="status">{dayLabel(selectedDay)} · {visibleCount} {visibleCount === 1 ? 'atração' : 'atrações'} para explorar</p>
        {itinerary.days[0]?.date && <p className="mb-5 text-xs text-muted-foreground">Os horários são referências do cadastro, não confirmação em tempo real. Confirme o funcionamento antes da visita, especialmente em feriados.</p>}
        <div id="day-locations" className="space-y-7">
        {visibleDays.map((day) => (
          <section key={day.day} aria-label={`Atrações do dia ${day.day}`}>
            {day.locations.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">Sem locais disponíveis para este dia nas bases selecionadas. Escolha outro dia para continuar explorando.</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {day.locations.map((location) => {
            const media = optionalMediaFields(location);
            return <LocalCard
              key={location.order}
              position={location.order}
              period={location.period}
              estimatedDuration={location.estimatedDuration}
              name={location.name}
              description={location.description}
              imageUrl={media.imageUrl}
              categories={media.categories}
              hasCoordinates={hasValidCoordinates(location)}
              location={location}
              isActive={activeLocationIndex === location.order - 1}
              onLocationClick={() => selectLocation(location.order - 1, true)}
            />;
          })}
            </div>
          </section>
        ))}
        </div>
      </section>

      <div id="itinerary-map" className="mt-10 scroll-mt-24">
        <Suspense fallback={<div className="h-[700px] rounded-3xl border border-border bg-muted p-6 text-muted-foreground" role="status">Preparando o mapa…</div>}><MapView
          days={itinerary.days}
          selectionRevision={selectionRevision}
          activeLocationIndex={activeLocationIndex}
          onMarkerSelect={(index) => {
            selectLocation(index);
            const day = itinerary.days.find(day => day.locations.some(location => location.order - 1 === index));
            if (day) setSelectedDay(day.day);
          }}
        /></Suspense>
      </div>
      <PartnersSection regions={regions} />
      {children}
    </main>
  );
};
