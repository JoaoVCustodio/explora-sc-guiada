import assert from "node:assert/strict";
import test from "node:test";
import { getMappableLocations, hasValidCoordinates } from "./map-utils.ts";
import type { ItineraryLocation } from "./types.ts";

const location = (latitude: number | null, longitude: number | null): ItineraryLocation => ({
  name: "Local",
  description: "Descrição",
  latitude,
  longitude,
});

test("aceita somente pares de coordenadas geográficas válidos", () => {
  assert.equal(hasValidCoordinates(location(-27.59, -48.55)), true);
  assert.equal(hasValidCoordinates(location(null, -48.55)), false);
  assert.equal(hasValidCoordinates(location(-91, -48.55)), false);
  assert.equal(hasValidCoordinates(location(-27.59, 181)), false);
});

test("preserva o índice original ao remover locais sem coordenadas", () => {
  const mappableLocations = getMappableLocations([
    location(null, null),
    location(-27.59, -48.55),
  ]);

  assert.equal(mappableLocations.length, 1);
  assert.equal(mappableLocations[0].index, 1);
  assert.deepEqual(mappableLocations[0].coordinates, [-27.59, -48.55]);
});
