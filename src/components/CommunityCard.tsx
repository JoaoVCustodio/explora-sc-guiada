import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Globe, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingSummary } from "@/components/RatingSummary";
import type { CommunitySummary } from "@/features/community/schema";

const publicationDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function describeItinerary(item: CommunitySummary) {
  const duration = `${item.days_count} ${item.days_count === 1 ? "dia" : "dias"}`;
  const places = `${item.locations_count} ${item.locations_count === 1 ? "lugar" : "lugares"}`;
  if (item.regions.length === 0) return `Um roteiro de ${duration}, com ${places} para conhecer.`;
  const regionText = item.regions.length === 1
    ? item.regions[0]
    : `${item.regions.slice(0, -1).join(", ")} e ${item.regions.at(-1)}`;
  return `Uma viagem de ${duration} por ${regionText}, com ${places} organizados para explorar.`;
}

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
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{describeItinerary(item)}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-muted/70 px-3"><CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{item.days_count} {item.days_count === 1 ? "dia" : "dias"}</span>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-muted/70 px-3"><MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{item.locations_count} {item.locations_count === 1 ? "local" : "locais"}</span>
      </div>
      {item.regions.length > 0 && <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="line-clamp-2">{item.regions.join(" · ")}</span></p>}

      <div className="mt-auto pt-5">
        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          <Avatar className="h-10 w-10 border border-primary/15">
            <AvatarFallback className="bg-accent text-sm font-semibold text-primary">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Criado por</p>
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="truncate">{item.author_name}</span>{isOwner && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">Você</span>}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-muted/40 px-3 py-2.5"><RatingSummary average={item.rating_average} count={item.reviews_count} /></div>
        <Button asChild className="mt-5 min-h-11 w-full rounded-xl">
          <Link to={detailUrl} aria-label={`Abrir roteiro ${item.title}`}>Ver roteiro completo<ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </div>
    </li>
  );
}
