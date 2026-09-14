import { z } from "zod";
import { normalizeItineraryResponse } from "./schema.ts";
import type { Itinerary, ItineraryRequest } from "./types.ts";
import type { Json, TablesInsert } from "../../integrations/supabase/types.ts";

export const savedItineraryIdSchema = z.string().uuid();

export const savedSummarySchema = z.object({
  id: savedItineraryIdSchema,
  title: z.string(),
  days_count: z.number().int().min(1).max(7),
  created_at: z.string().datetime({ offset: true }),
  locations: z.array(z.unknown()).min(1).max(140),
}).transform(({ locations, ...row }) => ({ ...row, locationsCount: locations.length }));

export type SavedItinerarySummary = z.infer<typeof savedSummarySchema>;

export const makeSavedItinerary = (
  id: string,
  userId: string,
  itinerary: Itinerary,
  request: Pick<ItineraryRequest, "days" | "regions" | "interests">,
): TablesInsert<"itineraries"> => {
  savedItineraryIdSchema.parse(id);
  z.string().uuid().parse(userId);
  z.number().int().min(1).max(7).parse(request.days);
  z.array(z.string().trim().min(1)).min(1).max(7).parse(request.regions);
  z.array(z.string().trim().min(1)).max(6).parse(request.interests);
  const validated = normalizeItineraryResponse(itinerary, request.days);
  return {
    id,
    user_id: userId,
    title: validated.title,
    description: validated.description,
    regions: [...request.regions],
    interests: [...request.interests],
    days_count: request.days,
    itinerary_data: JSON.parse(JSON.stringify(validated)) as Json,
  };
};
