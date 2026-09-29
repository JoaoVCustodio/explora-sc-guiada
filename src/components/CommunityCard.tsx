import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Globe, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingSummary } from "@/components/RatingSummary";
import type { CommunitySummary } from "@/features/community/schema";

const publicationDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function CommunityCard({ item, isOwner }: { item: CommunitySummary; isOwner: boolean }) {
  const detailUrl = `/comunidade/${item.id}`;
  const initial = item.author_name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "V";

  return (
    <li className="collection-card group h-full">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2 text-primary"><Globe className="h-4 w-4" aria-hidden="true" />Roteiro da comunidade</p>
        <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={item.published_at}>{publicationDate.format(new Date(item.published_at))}</time>
      </div>

      <h2 className="mt-4 line-clamp-3 break-words">
        <Link className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring" to={detailUrl}>{item.title}</Link>
      </h2>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-primary"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{item.days_count} {item.days_count === 1 ? "dia" : "dias"}</span>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-muted/70 px-3 text-foreground"><MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{item.locations_count} {item.locations_count === 1 ? "local" : "locais"}</span>
      </div>
      {item.regions.length > 0 && <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /><span className="line-clamp-2">{item.regions.join(" · ")}</span></p>}

      <div className="mt-auto pt-5">
        <div className={`rounded-xl border px-3 py-3 ${item.rating_average !== null && item.reviews_count > 0 ? "border-secondary/40 bg-secondary/15" : "border-border/60 bg-muted/40"}`}><RatingSummary average={item.rating_average} count={item.reviews_count} featured /></div>
        <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
          <Avatar className="h-10 w-10 border border-primary/15">
            <AvatarFallback className="bg-accent text-sm font-semibold text-primary">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Criado por</p>
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="truncate">{item.author_name}</span>{isOwner && <span className="shrink-0 rounded-full border border-primary/20 bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Você</span>}</p>
          </div>
        </div>

        <Button asChild className="mt-5 min-h-11 w-full rounded-xl">
          <Link to={detailUrl} aria-label={`Abrir roteiro ${item.title}`}>Ver roteiro completo<ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </div>
    </li>
  );
}
