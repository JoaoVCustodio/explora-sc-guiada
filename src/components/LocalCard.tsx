import { MapPinOff, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LocalCardProps {
  name: string;
  description: string;
  hasCoordinates: boolean;
  isActive: boolean;
  onLocationClick: () => void;
  position: number;
  period: "manha" | "tarde" | "noite";
  estimatedDuration: string;
}

export const LocalCard = ({
  name,
  description,
  hasCoordinates,
  isActive,
  onLocationClick,
  position,
  period,
  estimatedDuration,
}: LocalCardProps) => (
  <Card className={cn("h-full overflow-hidden border-border bg-card shadow-sm transition-colors", isActive && "border-primary ring-2 ring-primary/15")}>
    <article className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-bold leading-snug text-foreground">{name}</h4>
          <p className="mt-2 text-sm font-medium text-primary">
            {{ manha: "Manhã", tarde: "Tarde", noite: "Noite" }[period]} · Duração estimada: {estimatedDuration}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        {hasCoordinates ? (
          <button type="button" onClick={onLocationClick} aria-pressed={isActive} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Navigation className="h-4 w-4" aria-hidden="true" /> Ver no mapa
          </button>
        ) : (
          <p className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-muted px-3 text-sm font-medium text-muted-foreground">
            <MapPinOff className="h-4 w-4" aria-hidden="true" /> Sem coordenadas
          </p>
        )}
      </div>
    </article>
  </Card>
);
