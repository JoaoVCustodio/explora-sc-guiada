import assert from "node:assert/strict";
import test from "node:test";
import { separateAttractionRating } from "./attraction-rating.ts";

test("separa a avaliação registrada sem perder a descrição factual", () => {
  assert.deepEqual(
    separateAttractionRating("Visita ao parque. Avaliação registrada: 4,8/5 (15977 avaliações)."),
    { description: "Visita ao parque.", rating: { average: 4.8, count: 15977 } },
  );
  assert.deepEqual(
    separateAttractionRating("Parada no restaurante. Avaliação registrada: 5/5 (1 avaliação)."),
    { description: "Parada no restaurante.", rating: { average: 5, count: 1 } },
  );
  assert.deepEqual(
    separateAttractionRating("Visita à praia. Avaliação registrada: 4,8/5 (15.977 avaliações)."),
    { description: "Visita à praia.", rating: { average: 4.8, count: 15977 } },
  );
});

test("mantém descrições sem avaliação completa", () => {
  const description = "Visita ao museu. Avaliação registrada: 4,8/5.";
  assert.deepEqual(separateAttractionRating(description), { description, rating: null });
});
