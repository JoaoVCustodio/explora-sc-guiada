import assert from "node:assert/strict";
import test from "node:test";
import { makeSavedItinerary, savedSummarySchema } from "./saved-schema.ts";
import { normalizeItineraryResponse } from "./schema.ts";
import { getMappableLocations } from "./map-utils.ts";

const id = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const request = { days: 3, regions: ["Grande Florianópolis"], interests: ["praias"] };
const itinerary = normalizeItineraryResponse({
  titulo: "Viagem salva", descricao_geral: "Natureza e cultura", fonte: "base_Florianopolis",
  dias: [
    { dia: 1, locais: [{ ordem: 1, periodo: "manha", duracao_estimada: "1h30", nome: "Praia", descricao_curta: "Mar", latitude: -27, longitude: -48 }] },
    { dia: 2, locais: [{ ordem: 2, periodo: "tarde", duracao_estimada: "45min", nome: "Museu", descricao_curta: "Cultura", latitude: null, longitude: null }] },
    { dia: 3, locais: [] },
  ],
}, 3);

test("salvar e reabrir preserva roteiro completo, dias vazios e índices do mapa", () => {
  const row = makeSavedItinerary(id, userId, itinerary, request);
  const reopened = normalizeItineraryResponse(JSON.parse(JSON.stringify(row.itinerary_data)), row.days_count);
  assert.deepEqual(reopened, itinerary);
  assert.deepEqual(getMappableLocations(reopened.locations).map((location) => location.index), [0]);
  assert.equal(row.user_id, userId);
  assert.equal(row.title, itinerary.title);
  assert.equal(row.description, itinerary.description);
  assert.deepEqual(row.regions, request.regions);
  assert.deepEqual(row.interests, request.interests);
});

test("payload de salvamento mantém UUID estável e copia metadados sem estado compartilhado", () => {
  const row = makeSavedItinerary(id, userId, itinerary, request);
  assert.deepEqual(row, makeSavedItinerary(id, userId, itinerary, request));
  assert.notEqual(row.regions, request.regions);
  assert.notEqual(row.interests, request.interests);
  assert.notEqual(row.itinerary_data, itinerary);
});

test("salvamento rejeita usuário, dias ou metadados inválidos", () => {
  assert.throws(() => makeSavedItinerary(id, "", itinerary, request));
  assert.throws(() => makeSavedItinerary("inválido", userId, itinerary, request));
  for (const days of [0, 2, 8, 1.5]) {
    assert.throws(() => makeSavedItinerary(id, userId, itinerary, { ...request, days }));
  }
  assert.throws(() => makeSavedItinerary(id, userId, itinerary, { ...request, regions: [] }));
});

test("resumo conta todos os locais para a listagem", () => {
  const result = savedSummarySchema.parse({
    id, title: "Viagem salva", days_count: 3, created_at: "2026-09-13T22:00:00+00:00", locations: itinerary.locations,
  });
  assert.equal(result.locationsCount, 2);
  assert.equal(result.days_count, 3);
  assert.equal("locations" in result, false);
});
