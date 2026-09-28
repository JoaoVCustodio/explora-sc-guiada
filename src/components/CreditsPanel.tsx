import { ArrowUpRight, Coins, Loader2 } from "lucide-react";
import type { Credits } from "@/features/credits/useCredits";
import { Button } from "@/components/ui/button";

// Only contextual feedback belongs next to the generation action.
export function CreditsPanel({ credits, error, onRetry }: { credits: Credits | null; error: boolean; onRetry: () => void }) {
  if (error) return <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p role="alert" className="text-muted-foreground">Não foi possível consultar seus créditos.</p><Button type="button" variant="link" className="h-11 px-0" onClick={onRetry}>Tentar novamente</Button></div>;
  if (!credits) return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Consultando saldo…</p>;
  if (credits.pending) return <p role="status" className="text-sm text-muted-foreground">Uma geração está em andamento. Seu saldo será atualizado ao concluir.</p>;
  if (credits.balance > 1) return null;
  return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-accent/60 px-4 py-2">
    <p className="flex items-center gap-2 text-sm font-medium"><Coins className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{credits.balance === 0 ? "Seus créditos acabaram" : "Último crédito disponível"}</p>
    <Button type="button" variant="link" className="h-11 px-0 text-sm" onClick={() => window.dispatchEvent(new Event("open-credits"))} aria-haspopup="dialog">Obter créditos<ArrowUpRight aria-hidden="true" /></Button>
    {credits.balance === 0 && <p className="w-full pb-2 text-xs text-muted-foreground">Seus roteiros salvos e a Comunidade continuam disponíveis.</p>}
  </div>;
}
