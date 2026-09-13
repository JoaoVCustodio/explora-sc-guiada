import { Clock3, MapPin } from "lucide-react";

interface StatsBarProps {
  locationsCount: number;
  estimatedTime?: string;
}

export const StatsBar = ({ locationsCount, estimatedTime }: StatsBarProps) => (
  <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex items-center gap-3 border-r border-border p-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" aria-hidden="true" /></span>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Locais</dt><dd className="text-xl font-bold tabular-nums">{locationsCount}</dd></div>
    </div>
    <div className="flex items-center gap-3 p-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/20 text-amber-700"><Clock3 className="h-5 w-5" aria-hidden="true" /></span>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duração</dt><dd className="text-xl font-bold tabular-nums">{estimatedTime || "A definir"}</dd></div>
    </div>
  </dl>
);
