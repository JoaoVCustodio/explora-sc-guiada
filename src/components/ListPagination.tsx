import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListPagination({ page, hasMore, onPageChange, label }: {
  page: number; hasMore: boolean; onPageChange: (page: number) => void; label: string;
}) {
  if (page === 0 && !hasMore) return null;
  return <nav aria-label={label} className="list-pagination mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
    <Button type="button" variant="outline" className="min-h-11 rounded-xl bg-card px-3 sm:px-4" disabled={page === 0} onClick={() => onPageChange(page - 1)}><ChevronLeft aria-hidden="true" />Anterior</Button>
    <span className="text-sm font-medium tabular-nums text-muted-foreground" aria-live="polite">Página <span className="text-foreground">{page + 1}</span></span>
    <Button type="button" variant="outline" className="min-h-11 rounded-xl bg-card px-3 sm:px-4" disabled={!hasMore} onClick={() => onPageChange(page + 1)}>Próxima<ChevronRight aria-hidden="true" /></Button>
  </nav>;
}
