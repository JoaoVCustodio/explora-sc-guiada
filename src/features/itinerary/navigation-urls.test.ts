import assert from "node:assert/strict";
import test from "node:test";
import { googleMapsAttractionUrl, googleMapsDayRouteUrl, googleMapsDaySegments, wazeAttractionUrl } from "./navigation-urls.ts";
import type { ItineraryDay, ScheduledLocation } from "./types.ts";

const stop = (order: number): ScheduledLocation => ({
  name: `Parada ${order}`, description: "", latitude: -27 - order / 100, longitude: -48 - order / 100,
  order, period: "manha", estimatedDuration: "1h",
});
const day = (count: number): ItineraryDay => ({ day: 1, locations: Array.from({ length: count }, (_, index) => stop(index + 1)) });
const pair = (location: ScheduledLocation) => `${location.latitude},${location.longitude}`;
const routeStops = (value: string) => {
  const url = new URL(value);
  const origin = url.searchParams.get("origin");
  return [...(origin ? [origin] : []), ...(url.searchParams.get("waypoints")?.split("|") ?? []), url.searchParams.get("destination")];
};

test("navegação individual usa coordenadas em Google Maps e Waze", () => {
  const location = stop(1);
  const google = new URL(googleMapsAttractionUrl(location));
  const waze = new URL(wazeAttractionUrl(location));
  assert.equal(google.origin, "https://www.google.com");
  assert.equal(google.searchParams.get("destination"), pair(location));
  assert.equal(google.searchParams.get("api"), "1");
  assert.equal(waze.origin, "https://waze.com");
  assert.equal(waze.searchParams.get("ll"), pair(location));
  assert.equal(waze.searchParams.get("navigate"), "yes");
});

for (const count of [1, 2, 3, 4, 5]) {
  test(`rota de ${count} atrações preserva cada parada em um link`, () => {
    const locations = day(count).locations;
    const segments = googleMapsDaySegments(day(count));
    assert.equal(segments.length, 1);
    assert.deepEqual(routeStops(segments[0].url), locations.map(pair));
  });
}

test("mais de cinco atrações são divididas em trechos conectados e completos", () => {
  const locations = day(11).locations;
  const segments = googleMapsDaySegments({ day: 1, locations });
  assert.deepEqual(segments.map(({ from, to }) => [from, to]), [[1, 5], [5, 9], [9, 11]]);
  assert.deepEqual(segments.flatMap((segment, index) => routeStops(segment.url).slice(index ? 1 : 0)), locations.map(pair));
  assert.ok(segments.every((segment) => (new URL(segment.url).searchParams.get("waypoints")?.split("|").length ?? 0) <= 3));
});

test("não exporta parte do dia se faltar coordenada", () => {
  const incomplete = day(3);
  incomplete.locations[1].latitude = null;
  assert.deepEqual(googleMapsDaySegments(incomplete), []);
  assert.throws(() => googleMapsDayRouteUrl(incomplete.locations));
});
