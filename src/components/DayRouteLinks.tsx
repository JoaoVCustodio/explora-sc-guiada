import { ChevronDown, ExternalLink, Route } from "lucide-react";
import type { ItineraryDay } from "@/features/itinerary/types";
import { googleMapsDaySegments } from "@/features/itinerary/navigation-urls";

export const DayRouteLinks = ({ day }: { day: ItineraryDay }) => {
  if (!day.locations.length) return null;
  const segments = googleMapsDaySegments(day);
  if (!segments.length) return <p className="max-w-56 rounded-xl border border-border bg-card/95 p-3 text-xs text-muted-foreground shadow-md">Rota externa indisponível: há atrações sem coordenadas válidas neste dia.</p>;

  if (segments.length === 1) return (
    <a href={segments[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-primary shadow-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={`Abrir rota do dia ${day.day} no Google Maps (nova aba)`}>
      <Route className="h-4 w-4" aria-hidden="true" /> Abrir no Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );

  return (
    <details className="group max-w-[min(18rem,calc(100vw-5rem))] rounded-xl border border-border bg-card shadow-md" aria-label={`Rota externa do dia ${day.day}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <Route className="h-4 w-4 shrink-0" aria-hidden="true" /> Abrir no Google Maps <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border p-2">
        <p className="px-1 pb-1 text-xs leading-5 text-muted-foreground">Dia {day.day} em {segments.length} trechos, na ordem do roteiro. Abra o próximo ao terminar o anterior.</p>
        {segments.map((segment, index) => (
          <a key={segment.from} href={segment.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Abrir trecho ${index + 1} de ${segments.length}, paradas ${segment.from} a ${segment.to}, no Google Maps (nova aba)`}>
            Trecho {index + 1}: {segment.from}–{segment.to} <ExternalLink className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ))}
      </div>
    </details>
  );
};
