import assert from "node:assert/strict";
import test from "node:test";
import { calculatePaths, pathTotals, haversineMeters, estimateTravelSeconds, isCoordinate, ESTIMATED_SPEED_KMH, formatDistance, formatTravelTime } from "./model.ts";
import type { ItineraryDay, ScheduledLocation } from "../itinerary/types.ts";
import { parseOSRM, parseRoadRoute, routeCoordinates, routeUrl } from "../../../supabase/functions/route-osrm/contract.ts";
import { CACHE_KEY, CACHE_TTL, readCache, writeCache, routeKey } from "./cache.ts";
import { mergeRoadPaths } from "./model.ts";

const road = { geometry: { type: "LineString" as const, coordinates: [[-48, -27], [-49, -28]] as [number, number][] }, distanceMeters: 150000, durationSeconds: 7200 };
test("OSRM preserves ordered waypoints in one request, no trip optimization", () => {
  const url = routeUrl([[-49, -28], [-48, -27], [-50, -29]]);
  assert.ok(url.includes("/route/v1/driving/-49,-28;-48,-27;-50,-29?"));
  assert.ok(url.includes("geometries=geojson"));
  assert.throws(() => routeCoordinates([[0, 0]]));
  assert.throws(() => routeCoordinates(Array(21).fill([0, 0])));
  assert.throws(() => routeCoordinates([[null, 0], [1, 2]]));
});
test("OSRM response validates geometry, distance and duration; rejects failures", () => {
  assert.deepEqual(parseOSRM({ code: "Ok", routes: [{ geometry: road.geometry, distance: 150000, duration: 7200 }] }), road);
  for (const value of [null, {}, { code: "NoRoute" }, { code: "Ok", routes: [] }]) assert.throws(() => parseOSRM(value));
  assert.throws(() => parseRoadRoute({ ...road, distanceMeters: -1 }));
  assert.throws(() => parseRoadRoute({ ...road, geometry: { type: "LineString", coordinates: [[999, 0], [0, 0]] } }));
  assert.equal(formatDistance(150000, false), "150 km");
  assert.equal(formatTravelTime(7200, false), "2h00");
});
test("persistent cache survives recreation, expires, preserves coordinate order and tolerates corruption", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const key = routeKey(road.geometry.coordinates);
  writeCache(storage, key, road, 1000);
  assert.deepEqual(readCache({ getItem: storage.getItem }, key, 2000), road);
  assert.equal(readCache(storage, routeKey([...road.geometry.coordinates].reverse()), 2000), null);
  assert.equal(readCache(storage, key, 1000 + CACHE_TTL), null);
  storage.setItem(CACHE_KEY, "invalid");
  assert.equal(readCache(storage, key), null);
  assert.doesNotThrow(() => writeCache({ ...storage, setItem: () => { throw new Error("Quota"); } }, key, road));
});

const local = (order: number, longitude: number | null, latitude: number | null = 0): ScheduledLocation => ({
  order, longitude, latitude, name: "Local", description: "Teste", period: "manha", estimatedDuration: "1h",
});
const near = (actual: number, expected: number, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("road success and failed day remain independent, with correct mixed totals", () => {
  const localPaths = calculatePaths([{ day: 1, locations: [local(1, 0), local(2, 1)] }, { day: 2, locations: [local(3, 10), local(4, 11)] }]);
  const pending = mergeRoadPaths(localPaths, {});
  assert.ok(pending.every(p => p.loading));
  const paths = mergeRoadPaths(localPaths, { 1: road, 2: null });
  assert.equal(paths[0].road, true);
  assert.equal(paths[1].road, false);
  assert.ok(paths.every(p => !p.loading));
  assert.deepEqual(paths[0].geometry?.coordinates, [road.geometry.coordinates]);
  assert.deepEqual(paths[1].geometry, localPaths[1].geometry);
  assert.equal(pathTotals(paths, null).distanceMeters, road.distanceMeters + localPaths[1].distanceMeters);
  assert.equal(pathTotals(paths, 1).durationSeconds, road.durationSeconds);
});

test("Haversine: pontos iguais, distância conhecida e simetria", () => {
  assert.equal(haversineMeters([-48, -27], [-48, -27]), 0);
  near(haversineMeters([0, 0], [1, 0]), 111194.9266);
  near(haversineMeters([1, 0], [0, 0]), haversineMeters([0, 0], [1, 0]));
  near(haversineMeters([0, 0], [0, 1]), 111194.9266);
});
test("Haversine: antimeridiano, polos e antípodas mantêm resultados finitos", () => {
  near(haversineMeters([179, 0], [-179, 0]), 222389.8533);
  near(haversineMeters([0, 90], [180, 90]), 0);
  near(haversineMeters([0, 0], [180, 0]), Math.PI * 6371000);
});
test("coordenadas ausentes, não finitas ou fora dos limites são inválidas", () => {
  for (const value of [null, [], [0], [0, 0, 0], ["0", 0], [null, 0], [NaN, 0], [0, Infinity], [181, 0], [0, -91]]) assert.equal(isCoordinate(value), false);
  assert.equal(isCoordinate([0, 0]), true);
  assert.equal(isCoordinate([-180, -90]), true);
  assert.throws(() => haversineMeters([NaN, 0], [0, 0]), RangeError);
});
test("tempo usa constante de 40 km/h, sem arredondar antes da apresentação", () => {
  assert.equal(ESTIMATED_SPEED_KMH, 40);
  assert.equal(estimateTravelSeconds(40000), 3600);
  assert.equal(estimateTravelSeconds(20000), 1800);
  assert.equal(estimateTravelSeconds(0), 0);
  assert.equal(estimateTravelSeconds(40000, 80), 1800);
  assert.throws(() => estimateTravelSeconds(-1), RangeError);
  assert.throws(() => estimateTravelSeconds(1000, 0), RangeError);
  assert.throws(() => estimateTravelSeconds(Infinity), RangeError);
});
test("soma por dia e total sem conectar dias diferentes", () => {
  const days: ItineraryDay[] = [
    { day: 1, locations: [local(1, 0), local(2, 1), local(3, 2)] },
    { day: 2, locations: [local(4, 100), local(5, 101)] },
  ];
  const paths = calculatePaths(days);
  const unit = haversineMeters([0, 0], [1, 0]);
  near(paths[0].distanceMeters, 2 * unit);
  near(paths[1].distanceMeters, unit);
  near(pathTotals(paths, null).distanceMeters, 3 * unit);
  near(pathTotals(paths, 2).distanceMeters, unit);
  near(pathTotals(paths, null).durationSeconds, estimateTravelSeconds(3 * unit));
  assert.equal(pathTotals(paths, null).segmentCount, 3);
  assert.deepEqual(paths[0].geometry?.coordinates, [[[0, 0], [1, 0], [2, 0]]]);
  assert.deepEqual(paths[1].geometry?.coordinates, [[[100, 0], [101, 0]]]);
});
test("preserva exatamente ordem e dados do itinerário, sem ordenar por coordenada", () => {
  const days: ItineraryDay[] = [{ day: 1, locations: [local(1, 3), local(2, 1), local(3, 2)] }];
  const snapshot = structuredClone(days);
  assert.deepEqual(calculatePaths(days)[0].geometry?.coordinates, [[[3, 0], [1, 0], [2, 0]]]);
  assert.deepEqual(days, snapshot);
});
test("lacunas interrompem apenas os trechos adjacentes sem atalhos", () => {
  const day = { day: 1, locations: [local(1, 0), local(2, 1), local(3, null), local(4, 3), local(5, 4)] };
  const path = calculatePaths([day])[0];
  assert.deepEqual(path.geometry?.coordinates, [[[0, 0], [1, 0]], [[3, 0], [4, 0]]]);
  assert.equal(path.omittedSegments, 2);
  assert.equal(path.segmentCount, 2);
  near(path.distanceMeters, 2 * haversineMeters([0, 0], [1, 0]));
  const leading = calculatePaths([{ day: 1, locations: [local(1, null), local(2, 1), local(3, 2)] }])[0];
  assert.equal(leading.segmentCount, 1);
  assert.equal(leading.omittedSegments, 1);
});
test("pontos inválidos não eliminam os outros segmentos do dia", () => {
  const path = calculatePaths([{ day: 1, locations: [local(1, 0), local(2, NaN), local(3, 1), local(4, 2), local(5, 0, 95)] }])[0];
  assert.deepEqual(path.geometry?.coordinates, [[[1, 0], [2, 0]]]);
  assert.equal(path.omittedSegments, 3);
  near(path.distanceMeters, haversineMeters([1, 0], [2, 0]));
});
test("dias vazios, ponto único, pontos iguais e todas as coordenadas ausentes", () => {
  const paths = calculatePaths([
    { day: 1, locations: [] },
    { day: 2, locations: [local(1, 0)] },
    { day: 3, locations: [local(2, null), local(3, null)] },
    { day: 4, locations: [local(4, 0), local(5, 0)] },
  ]);
  assert.ok(paths.every((path) => path.distanceMeters === 0 && path.durationSeconds === 0));
  assert.ok(paths.slice(0, 3).every((path) => path.geometry === null));
  assert.equal(paths[2].omittedSegments, 1);
  assert.equal(paths[3].segmentCount, 1);
  assert.equal(pathTotals([], null).distanceMeters, 0);
});
test("formatação indica aproximação e arredonda minutos somente no resumo", () => {
  assert.equal(formatDistance(18400), "~18,4 km");
  assert.equal(formatTravelTime(estimateTravelSeconds(18400)), "~28 min");
  assert.equal(formatTravelTime(8400), "~2h20");
  assert.equal(formatTravelTime(0), "~0 min");
});
