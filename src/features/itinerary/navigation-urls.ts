import { hasValidCoordinates } from "./map-utils.ts";
import type { ItineraryDay, ItineraryLocation } from "./types.ts";

// Maps URLs support three intermediate waypoints in mobile browsers.
export const MAX_GOOGLE_MAPS_DAY_STOPS = 5;

const coordinates = (location: ItineraryLocation) => {
  if (!hasValidCoordinates(location)) throw new RangeError("A atração não tem coordenadas válidas.");
  return `${location.latitude},${location.longitude}`;
};

export const googleMapsAttractionUrl = (location: ItineraryLocation) => {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", coordinates(location));
  url.searchParams.set("travelmode", "driving");
  return url.toString();
};

export const wazeAttractionUrl = (location: ItineraryLocation) => {
  const url = new URL("https://waze.com/ul");
  url.searchParams.set("ll", coordinates(location));
  url.searchParams.set("navigate", "yes");
  return url.toString();
};

export const googleMapsDayRouteUrl = (locations: readonly ItineraryLocation[]) => {
  if (!locations.length || locations.length > MAX_GOOGLE_MAPS_DAY_STOPS) {
    throw new RangeError("O trecho precisa conter de uma a cinco atrações.");
  }
  if (locations.length === 1) return googleMapsAttractionUrl(locations[0]);

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", coordinates(locations[0]));
  url.searchParams.set("destination", coordinates(locations[locations.length - 1]));
  if (locations.length > 2) url.searchParams.set("waypoints", locations.slice(1, -1).map(coordinates).join("|"));
  url.searchParams.set("travelmode", "driving");
  return url.toString();
};

export interface DayRouteSegment {
  url: string;
  from: number;
  to: number;
}

export const googleMapsDaySegments = (day: ItineraryDay): DayRouteSegment[] => {
  // A missing point must never disappear silently from an exported route.
  if (day.locations.some((location) => !hasValidCoordinates(location))) return [];
  const segments: DayRouteSegment[] = [];
  for (let start = 0; start < day.locations.length; start += MAX_GOOGLE_MAPS_DAY_STOPS - 1) {
    const end = Math.min(start + MAX_GOOGLE_MAPS_DAY_STOPS, day.locations.length);
    const stops = day.locations.slice(start, end);
    segments.push({ url: googleMapsDayRouteUrl(stops), from: start + 1, to: end });
    if (end === day.locations.length) break;
  }
  return segments;
};
