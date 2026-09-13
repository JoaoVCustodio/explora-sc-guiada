export interface ItineraryLocation {
  name: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Itinerary {
  title: string;
  description: string;
  locations: ItineraryLocation[];
  estimatedTime?: string;
  source?: string;
}

export interface ItineraryRequest {
  preferences: string;
  interests: string[];
  regions: string[];
}
