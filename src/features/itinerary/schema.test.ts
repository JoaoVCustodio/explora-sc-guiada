import assert from "node:assert/strict";
import test from "node:test";
import { ItineraryValidationError, normalizeItineraryResponse } from "./schema.ts";

test("normaliza uma resposta do n8n com JSON aninhado", () => {
  const output = {
    titulo: "Dia na serra",
    descricao_geral: "Natureza e gastronomia.",
    tempo_estimado: "8h",
    locais: [
      {
        nome: "Morro da Igreja",
        descricao_curta: "Vista panorâmica.",
        latitude: "-28.126",
        longitude: "-49.479",
      },
    ],
  };

  const itinerary = normalizeItineraryResponse([
    { output: JSON.stringify(JSON.stringify(output)) },
  ]);

  assert.equal(itinerary.title, "Dia na serra");
  assert.equal(itinerary.locations[0].latitude, -28.126);
  assert.equal(itinerary.locations[0].longitude, -49.479);
});

test("mantém o roteiro utilizável quando campos opcionais e coordenadas faltam", () => {
  const itinerary = normalizeItineraryResponse({
    locais: [{ nome: "Centro Histórico", latitude: "inválida" }],
  });

  assert.equal(itinerary.title, "Roteiro personalizado em Santa Catarina");
  assert.equal(itinerary.locations[0].description, "Descrição não informada pelo gerador.");
  assert.equal(itinerary.locations[0].latitude, null);
  assert.equal(itinerary.locations[0].longitude, null);
});

test("rejeita respostas vazias ou sem locais", () => {
  assert.throws(
    () => normalizeItineraryResponse({ titulo: "Sem destinos" }),
    ItineraryValidationError,
  );
  assert.throws(() => normalizeItineraryResponse(""), ItineraryValidationError);
});
