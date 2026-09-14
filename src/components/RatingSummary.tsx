import { Star } from "lucide-react";

export const RatingSummary = ({ average, count }: { average: number | null; count: number }) => (
  <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
    <Star className="h-4 w-4 text-primary" aria-hidden="true" />
    {average === null || count === 0 ? "Sem avaliações" : `${average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 · ${count} ${count === 1 ? "avaliação" : "avaliações"}`}
  </p>
);
