import assert from "node:assert/strict";
import test from "node:test";
import { ItineraryValidationError, normalizeItineraryResponse } from "./schema.ts";
import { getMappableLocations } from "./map-utils.ts";

const local = (ordem: number) => ({
  ordem, periodo: "manha", nome: `Local ${ordem}`, descricao_curta: "Natureza.",
  duracao_estimada: "1h30", latitude: "-27.59", longitude: "-48.55",
});
const roteiro = (count = 3) => ({
  titulo: "Viagem em SC", descricao_geral: "Natureza e cultura.", fonte: "base_Florianopolis",
  dias: Array.from({ length: count }, (_, i) => ({ dia: i + 1, locais: [local(i + 1)] })),
});

test("preserva dias, períodos, duração e ordem global na saída estruturada", () => {
  const result = normalizeItineraryResponse([{ output: roteiro() }], 3);
  assert.equal(result.days.length, 3);
  assert.equal(result.estimatedTime, "3 dias");
  assert.equal(result.days[1].locations[0].order, 2);
  assert.equal(result.days[1].locations[0].period, "manha");
  assert.equal(result.days[1].locations[0].estimatedDuration, "1h30");
  assert.deepEqual(result.locations.map((l) => l.name), ["Local 1", "Local 2", "Local 3"]);
  for (const count of [1, 7]) {
    assert.equal(normalizeItineraryResponse(roteiro(count), count).days.length, count);
  }
});

test("rejeita contagem incorreta, dias ausentes e formato plano antigo", () => {
  assert.throws(() => normalizeItineraryResponse(roteiro(2), 3));
  assert.throws(() => normalizeItineraryResponse(roteiro(0)));
  assert.throws(() => normalizeItineraryResponse(roteiro(8)));
  assert.throws(() => normalizeItineraryResponse({ locais: [local(1)] }, 1));
});

test("rejeita dias duplicados e ordem reiniciada", () => {
  const value = roteiro();
  value.dias[1].dia = 1;
  assert.throws(() => normalizeItineraryResponse(value, 3));
  value.dias[1].dia = 2;
  value.dias[1].locais[0].ordem = 1;
  assert.throws(() => normalizeItineraryResponse(value, 3));
});

test("rejeita período inválido, regressão de período e duração ausente", () => {
  const value = roteiro(1);
  value.dias[0].locais[0].periodo = "madrugada";
  assert.throws(() => normalizeItineraryResponse(value, 1));
  value.dias[0].locais[0].periodo = "noite";
  value.dias[0].locais.push(local(2));
  assert.throws(() => normalizeItineraryResponse(value, 1));
  value.dias[0].locais[0].periodo = "manha";
  value.dias[0].locais[0].duracao_estimada = "";
  assert.throws(() => normalizeItineraryResponse(value, 1));
});

test("não trunca o itinerário no antigo limite de 20 locais", () => {
  const value = roteiro(7);
  value.dias.forEach((day, i) => { day.locais = Array.from({ length: 4 }, (_, j) => local(i * 4 + j + 1)); });
  const result = normalizeItineraryResponse(value, 7);
  assert.equal(result.locations.length, 28);
  assert.equal(result.days[6].locations[3].order, 28);
});

test("mapa mantém índice global ao omitir local sem coordenadas", () => {
  const value = roteiro();
  value.dias[0].locais[0].latitude = "inválida";
  const result = normalizeItineraryResponse(value, 3);
  assert.deepEqual(getMappableLocations(result.locations).map((l) => l.index), [1, 2]);
});

test("permite dia vazio, mas rejeita itinerário totalmente vazio", () => {
  const value = roteiro(2);
  value.dias[1].locais = [];
  assert.equal(normalizeItineraryResponse(value, 2).days[1].locations.length, 0);
  value.dias[0].locais = [];
  assert.throws(() => normalizeItineraryResponse(value, 2));
});

test("normaliza uma resposta do n8n com JSON aninhado", () => {
  const output = {
    titulo: "Dia na serra",
    descricao_geral: "Natureza e gastronomia.",
    dias: [{ dia: 1, locais: [
      {
        ordem: 1, periodo: "manha", duracao_estimada: "1h30",
        nome: "Morro da Igreja",
        descricao_curta: "Vista panorâmica.",
        latitude: "-28.126",
        longitude: "-49.479",
      },
    ] }],
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
    dias: [{ dia: 1, locais: [{ nome: "Centro Histórico", latitude: "inválida", ordem: 1, periodo: "tarde", duracao_estimada: "45min" }] }],
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
