import type { ItineraryLocation } from "./types.ts";

export interface MappableLocation {
  index: number;
  location: ItineraryLocation;
  coordinates: [number, number];
}

export const hasValidCoordinates = (location: ItineraryLocation) =>
  location.latitude !== null &&
  location.longitude !== null &&
  Number.isFinite(location.latitude) &&
  Number.isFinite(location.longitude) &&
  location.latitude >= -90 &&
  location.latitude <= 90 &&
  location.longitude >= -180 &&
  location.longitude <= 180;

export const getMappableLocations = (locations: ItineraryLocation[]): MappableLocation[] =>
  locations.flatMap((location, index) =>
    hasValidCoordinates(location)
      ? [
          {
            index,
            location,
            coordinates: [location.latitude as number, location.longitude as number],
          },
        ]
      : [],
  );
