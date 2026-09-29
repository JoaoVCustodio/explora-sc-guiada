import { Star } from "lucide-react";

export const RatingSummary = ({ average, count, featured = false }: { average: number | null; count: number; featured?: boolean }) => {
  const hasReviews = average !== null && count > 0;
  return (
    <p className={`flex flex-wrap items-center gap-1.5 text-sm ${hasReviews && featured ? "text-foreground" : "text-muted-foreground"}`}>
      <Star className={`h-4 w-4 ${hasReviews && featured ? "fill-[color:var(--brand-amber)] text-[color:var(--brand-amber-ink)]" : hasReviews ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
      {hasReviews && featured ? <><strong className="font-bold tabular-nums">{average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5</strong><span className="text-muted-foreground">· {count.toLocaleString("pt-BR")} {count === 1 ? "avaliação" : "avaliações"}</span></> : hasReviews ? `${average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 · ${count} ${count === 1 ? "avaliação" : "avaliações"}` : "Sem avaliações"}
    </p>
  );
};
