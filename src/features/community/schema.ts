import { z } from "zod";

export const REVIEW_COMMENT_LIMIT = 500;
export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comment: z.string().trim().max(REVIEW_COMMENT_LIMIT, "Use até 500 caracteres.").transform((text) => text || null),
});
export const publicNameSchema = z.string().nullable().transform((name) => {
  const trimmed = name?.trim();
  return trimmed && !trimmed.includes("@") ? trimmed.slice(0, 80) : "Viajante";
});
export const communitySummarySchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), title: z.string(), regions: z.array(z.string()),
  days_count: z.number().int().min(1).max(7), locations_count: z.number().int().min(1).max(140),
  published_at: z.string().datetime({ offset: true }), author_name: publicNameSchema,
  rating_average: z.number().min(1).max(5).nullable(), reviews_count: z.number().int().min(0),
});
export const reviewSchema = z.object({
  itinerary_id: z.string().uuid(), user_id: z.string().uuid(), rating: z.number().int().min(1).max(5),
  comment: z.string().max(REVIEW_COMMENT_LIMIT).nullable(),
  created_at: z.string().datetime({ offset: true }), updated_at: z.string().datetime({ offset: true }),
});
export const publicReviewSchema = reviewSchema.extend({ author_name: publicNameSchema });
export type CommunitySummary = z.infer<typeof communitySummarySchema>;
export type Review = z.infer<typeof reviewSchema>;
export type PublicReview = z.infer<typeof publicReviewSchema>;
