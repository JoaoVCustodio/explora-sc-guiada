import { ArrowUpRight, Clock3, MapPin, MapPinOff, MoonStar, SunMedium, Sunrise } from "lucide-react";
import { CardMedia } from "@/components/CardMedia";
import { AttractionNavigation } from "@/components/AttractionNavigation";
import { Card } from "@/components/ui/card";
import type { ItineraryLocation } from "@/features/itinerary/types";
import { resolveAttractionImage } from "@/features/media/card-images";
import { cn } from "@/lib/utils";

interface LocalCardProps {
  name: string;
  description: string;
  hasCoordinates: boolean;
  location: ItineraryLocation;
  isActive: boolean;
  onLocationClick: () => void;
  position: number;
  period: "manha" | "tarde" | "noite";
  estimatedDuration: string;
  imageUrl?: string | null;
  categories?: readonly string[];
}

const periodDetails = {
  manha: { label: "Manhã", Icon: Sunrise },
  tarde: { label: "Tarde", Icon: SunMedium },
  noite: { label: "Noite", Icon: MoonStar },
} as const;

export const LocalCard = ({
  name,
  description,
  hasCoordinates,
  location,
  isActive,
  onLocationClick,
  position,
  period,
  estimatedDuration,
  imageUrl,
  categories,
}: LocalCardProps) => {
  const { label: periodLabel, Icon: PeriodIcon } = periodDetails[period];
  const image = resolveAttractionImage({ name, description, imageUrl, categories });

  return (
    <Card className={cn("place-card h-full overflow-hidden border-border/80 bg-card focus-within:border-primary/50", isActive && "is-active border-primary/60")}>
      <article className="flex h-full flex-col">
        <CardMedia image={image} name={name} className="aspect-[16/9] w-full" />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <header className="flex items-start gap-4">
            <span className="place-number flex h-11 w-11 shrink-0 items-center justify-center text-sm font-bold text-primary" aria-label={`Parada ${position}`}>
              {String(position).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="eyebrow text-primary">Parada do roteiro</p>
                {isActive && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">No mapa</span>}
              </div>
              <h4 className="mt-2 break-words text-foreground">{name}</h4>
            </div>
          </header>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground" aria-label={`${periodLabel}, duração estimada de ${estimatedDuration}`}>
            <span className="place-detail inline-flex min-h-8 items-center gap-1.5 rounded-full bg-accent/70 px-3 text-primary">
              <PeriodIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {periodLabel}
            </span>
            <span className="place-detail inline-flex min-h-8 items-center gap-1.5 rounded-full bg-muted/70 px-3">
              <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {estimatedDuration}
            </span>
          </div>

          <div className="place-description mt-4 flex-1 border-l-2 border-primary/15 pl-4">
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          <div className="mt-5 border-t border-border/60 pt-3">
            {hasCoordinates ? (
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <button type="button" onClick={onLocationClick} aria-pressed={isActive} className="place-map-action group/action flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span>Ver local no mapa</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover/action:-translate-y-0.5 group-hover/action:translate-x-0.5" aria-hidden="true" />
                </button>
                <AttractionNavigation location={location} />
              </div>
            ) : (
              <p className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted-foreground">
                <MapPinOff className="h-4 w-4" aria-hidden="true" /> Sem coordenadas disponíveis
              </p>
            )}
          </div>
        </div>
      </article>
    </Card>
  );
};
