import { ChevronDown, Navigation } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { googleMapsAttractionUrl, wazeAttractionUrl } from "@/features/itinerary/navigation-urls";
import type { ItineraryLocation } from "@/features/itinerary/types";

export const AttractionNavigation = ({ location }: { location: ItineraryLocation }) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={`Navegar até ${location.name}`}>
      <Navigation className="h-4 w-4" aria-hidden="true" /> Navegar até aqui <ChevronDown className="h-4 w-4" aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="min-w-44 rounded-xl p-1.5">
      <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-lg px-3">
        <a href={googleMapsAttractionUrl(location)} target="_blank" rel="noopener noreferrer" aria-label={`Navegar até ${location.name} com Google Maps (nova aba)`}>Google Maps</a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-lg px-3">
        <a href={wazeAttractionUrl(location)} target="_blank" rel="noopener noreferrer" aria-label={`Navegar até ${location.name} com Waze (nova aba)`}>Waze</a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
