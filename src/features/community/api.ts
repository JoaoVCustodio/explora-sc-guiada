import { supabase } from "@/integrations/supabase/client";
import { normalizeItineraryResponse } from "@/features/itinerary/schema";
import { savedItineraryIdSchema } from "@/features/itinerary/saved-schema";
import { communitySummarySchema, publicNameSchema, publicReviewSchema, reviewInputSchema, reviewSchema } from "./schema";

export const COMMUNITY_PAGE_SIZE = 20;
const SUMMARY_COLUMNS = "id,user_id,title,regions,days_count,locations_count,published_at,author_name,rating_average,reviews_count";

export async function setItineraryPublication(id: string, userId: string, isPublic: boolean) {
  const { data, error } = await supabase.from("itineraries").update({ is_public: isPublic })
    .eq("id", id).eq("user_id", userId).select("is_public,published_at").single();
  if (error || !data) throw new Error("Não foi possível alterar a publicação. Tente novamente.");
  return data;
}
export async function getPublicName(userId: string, signal: AbortSignal) {
  const { data, error } = await supabase.rpc("community_author_name", { author_id: userId }).abortSignal(signal);
  if (error) throw new Error("Não foi possível carregar seu nome público.");
  return publicNameSchema.parse(data);
}
export async function listCommunityItineraries(page: number, signal: AbortSignal) {
  const { data, error } = await supabase.from("community_itineraries").select(SUMMARY_COLUMNS)
    .order("published_at", { ascending: false }).order("id", { ascending: false })
    .range(page * COMMUNITY_PAGE_SIZE, (page + 1) * COMMUNITY_PAGE_SIZE).abortSignal(signal);
  if (error) throw new Error("Não foi possível carregar a comunidade. Tente novamente.");
  const rows = (data ?? []).map((row) => communitySummarySchema.parse(row));
  return { items: rows.slice(0, COMMUNITY_PAGE_SIZE), hasMore: rows.length > COMMUNITY_PAGE_SIZE };
}
export async function getCommunityItinerary(id: string, signal: AbortSignal) {
  if (!savedItineraryIdSchema.safeParse(id).success) return null;
  const { data, error } = await supabase.from("community_itineraries").select("*").eq("id", id)
    .abortSignal(signal).maybeSingle();
  if (error) throw new Error("Não foi possível abrir o roteiro da comunidade.");
  if (!data) return null;
  return { ...communitySummarySchema.parse(data), itinerary: normalizeItineraryResponse(data.itinerary_data, data.days_count) };
}
export async function listReviews(id: string, page: number, signal: AbortSignal) {
  const { data, error } = await supabase.from("community_reviews").select("*").eq("itinerary_id", id)
    .order("created_at", { ascending: false }).order("user_id", { ascending: false })
    .range(page * COMMUNITY_PAGE_SIZE, (page + 1) * COMMUNITY_PAGE_SIZE).abortSignal(signal);
  if (error) throw new Error("Não foi possível carregar as avaliações.");
  const rows = (data ?? []).map((row) => publicReviewSchema.parse(row));
  return { items: rows.slice(0, COMMUNITY_PAGE_SIZE), hasMore: rows.length > COMMUNITY_PAGE_SIZE };
}
export async function getOwnReview(id: string, userId: string, signal: AbortSignal) {
  const { data, error } = await supabase.from("itinerary_reviews").select("*")
    .eq("itinerary_id", id).eq("user_id", userId).abortSignal(signal).maybeSingle();
  if (error) throw new Error("Não foi possível carregar sua avaliação.");
  return data ? reviewSchema.parse(data) : null;
}
export async function saveReview(id: string, userId: string, rating: number, comment: string, editing: boolean) {
  const input = reviewInputSchema.parse({ rating, comment });
  const result = editing
    ? await supabase.from("itinerary_reviews").update(input).eq("itinerary_id", id).eq("user_id", userId).select("user_id").single()
    : await supabase.from("itinerary_reviews").insert({ itinerary_id: id, user_id: userId, ...input }).select("user_id").single();
  if (result.error?.code === "23505") throw new Error("Você já avaliou este roteiro. Atualize a página para editar sua avaliação.");
  if (result.error) throw new Error("Não foi possível salvar a avaliação. O roteiro pode ter sido retirado da comunidade. Atualize a página e tente novamente.");
}
export async function deleteReview(id: string, userId: string) {
  const { error } = await supabase.from("itinerary_reviews").delete().eq("itinerary_id", id).eq("user_id", userId);
  if (error) throw new Error("Não foi possível remover sua avaliação. Tente novamente.");
}
