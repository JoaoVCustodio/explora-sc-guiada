import assert from "node:assert/strict";
import test from "node:test";
import { communitySummarySchema, publicNameSchema, reviewInputSchema } from "./schema.ts";

test("avaliações aceitam apenas notas inteiras de 1 a 5", () => {
  for (const rating of [1, 2, 3, 4, 5]) assert.equal(reviewInputSchema.parse({ rating, comment: "" }).rating, rating);
  for (const rating of [0, 6, 1.5, NaN, "5", null]) assert.equal(reviewInputSchema.safeParse({ rating, comment: "" }).success, false);
});
test("comentário é opcional, aparado e limitado a 500 caracteres", () => {
  assert.equal(reviewInputSchema.parse({ rating: 4, comment: "   " }).comment, null);
  assert.equal(reviewInputSchema.parse({ rating: 4, comment: " Gostei! " }).comment, "Gostei!");
  assert.equal(reviewInputSchema.parse({ rating: 4, comment: "a".repeat(500) }).comment?.length, 500);
  assert.equal(reviewInputSchema.safeParse({ rating: 4, comment: "a".repeat(501) }).success, false);
});
test("nome público nunca usa email como fallback", () => {
  for (const name of [null, "", "   ", "member@example.test", "Nome <member@example.test>"]) assert.equal(publicNameSchema.parse(name), "Viajante");
  assert.equal(publicNameSchema.parse(" Ana Silva "), "Ana Silva");
  assert.equal(publicNameSchema.parse("A".repeat(100)).length, 80);
});
test("resumo aceita ausência de avaliações e média calculada no banco", () => {
  const row = { id: "11111111-1111-4111-8111-111111111111", user_id: "22222222-2222-4222-8222-222222222222",
    title: "Viagem", regions: ["Grande Florianópolis"], days_count: 3, locations_count: 23,
    published_at: "2026-09-14T03:00:00+00:00", author_name: "Ana", rating_average: null, reviews_count: 0 };
  assert.equal(communitySummarySchema.parse(row).rating_average, null);
  assert.equal(communitySummarySchema.parse({ ...row, rating_average: 4.5, reviews_count: 50 }).reviews_count, 50);
  assert.equal(communitySummarySchema.safeParse({ ...row, days_count: 8 }).success, false);
});
