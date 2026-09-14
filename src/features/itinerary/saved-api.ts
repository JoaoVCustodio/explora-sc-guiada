import { supabase } from "@/integrations/supabase/client";
import { normalizeItineraryResponse } from "./schema";
import { makeSavedItinerary, savedItineraryIdSchema, savedSummarySchema } from "./saved-schema";
import type { Itinerary, ItineraryRequest } from "./types";

export const SAVED_PAGE_SIZE = 20;

export async function saveItinerary(
  id: string,
  userId: string,
  itinerary: Itinerary,
  request: Pick<ItineraryRequest, "days" | "regions" | "interests">,
) {
  const payload = makeSavedItinerary(id, userId, itinerary, request);
  const { error } = await supabase.from("itineraries").insert(payload);
  if (error?.code === "23505") {
    // Retrying after a lost response reuses the UUID instead of creating another row.
    const { data, error: lookupError } = await supabase.from("itineraries")
      .select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!lookupError && data) return id;
  }
  if (error) throw new Error("Não foi possível salvar o roteiro. Verifique sua conexão e tente novamente.");
  return id;
}

export async function listSavedItineraries(userId: string, page: number, signal: AbortSignal) {
  const { data, error } = await supabase.from("itineraries")
    .select("id,title,days_count,created_at,locations:itinerary_data->locations")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(page * SAVED_PAGE_SIZE, (page + 1) * SAVED_PAGE_SIZE)
    .abortSignal(signal);
  if (error) throw new Error("Não foi possível carregar seus roteiros. Tente novamente.");
  const rows = (data ?? []).map((row) => savedSummarySchema.parse(row));
  return { items: rows.slice(0, SAVED_PAGE_SIZE), hasMore: rows.length > SAVED_PAGE_SIZE };
}

export async function getSavedItinerary(id: string, userId: string, signal: AbortSignal) {
  if (!savedItineraryIdSchema.safeParse(id).success) return null;
  const { data, error } = await supabase.from("itineraries").select("*")
    .eq("id", id).eq("user_id", userId).abortSignal(signal).maybeSingle();
  if (error) throw new Error("Não foi possível abrir o roteiro. Tente novamente.");
  if (!data) return null;
  return { ...data, itinerary: normalizeItineraryResponse(data.itinerary_data, data.days_count) };
}

export async function deleteSavedItinerary(id: string, userId: string) {
  savedItineraryIdSchema.parse(id);
  const { error } = await supabase.from("itineraries").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error("Não foi possível excluir o roteiro. Tente novamente.");
}
