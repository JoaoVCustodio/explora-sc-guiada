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
  days: ItineraryDay[];
  estimatedTime?: string;
  source?: string;
}

export interface ScheduledLocation extends ItineraryLocation {
  order: number;
  period: "manha" | "tarde" | "noite";
  estimatedDuration: string;
}

export interface ItineraryDay {
  day: number;
  date?: string;
  locations: ScheduledLocation[];
}

export interface ItineraryRequest {
  startDate?: string;
  days: number;
  preferences: string;
  interests: string[];
  regions: string[];
}
