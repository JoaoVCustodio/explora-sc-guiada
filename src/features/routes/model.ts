import type { ItineraryDay } from "../itinerary/types.ts";
import type { RoadRoute } from "../../../supabase/functions/route-osrm/contract.ts";

export type Coordinate = [number, number]; // GeoJSON: longitude, latitude
export const ESTIMATED_SPEED_KMH = 40;
const EARTH_RADIUS_METERS = 6_371_000;
const radians = (degrees: number) => degrees * Math.PI / 180;

export function isCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
    typeof value[1] === "number" && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}

/** Great-circle distance on a spherical Earth, not a distance along streets. */
export function haversineMeters(from: Coordinate, to: Coordinate): number {
  if (!isCoordinate(from) || !isCoordinate(to)) throw new RangeError("Invalid coordinates");
  const dLat = radians(to[1] - from[1]);
  const dLon = radians(to[0] - from[0]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(dLon / 2) ** 2;
  // Clamp floating point error, especially near antipodal points.
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function estimateTravelSeconds(distanceMeters: number, speedKmh = ESTIMATED_SPEED_KMH): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || !Number.isFinite(speedKmh) || speedKmh <= 0) throw new RangeError("Invalid distance or speed");
  return distanceMeters / 1000 / speedKmh * 3600;
}

export interface DayPath {
  day: number;
  geometry: { type: "MultiLineString"; coordinates: Coordinate[][] } | null;
  distanceMeters: number;
  durationSeconds: number;
  segmentCount: number;
  omittedSegments: number;
}

export function mergeRoadPaths(paths: DayPath[], routes: Record<number, RoadRoute | null>) {
  return paths.map(path => {
    const road = routes[path.day];
    const eligible = path.segmentCount > 0 && path.omittedSegments === 0 && path.segmentCount < 20;
    return road ? { ...path, ...road, geometry: { type: "MultiLineString" as const, coordinates: [road.geometry.coordinates] }, road: true, loading: false }
      : { ...path, road: false, loading: eligible && routes[path.day] === undefined };
  });
}

/** Never sort, mutate, bridge missing coordinates, or connect different days. */
export function calculatePaths(days: readonly ItineraryDay[]): DayPath[] {
  return days.map((day) => {
    const lines: Coordinate[][] = [];
    let previous: Coordinate | null = null;
    let currentLine: Coordinate[] = [];
    let distanceMeters = 0;
    let segmentCount = 0;
    for (const local of day.locations) {
      const value = [local.longitude, local.latitude];
      if (!isCoordinate(value)) {
        previous = null;
        currentLine = [];
        continue;
      }
      if (previous) {
        if (!currentLine.length) { currentLine = [previous]; lines.push(currentLine); }
        currentLine.push(value);
        distanceMeters += haversineMeters(previous, value);
        segmentCount++;
      }
      previous = value;
    }
    return {
      day: day.day,
      geometry: lines.length ? { type: "MultiLineString", coordinates: lines } : null,
      distanceMeters,
      durationSeconds: estimateTravelSeconds(distanceMeters),
      segmentCount,
      omittedSegments: Math.max(0, day.locations.length - 1) - segmentCount,
    };
  });
}

export function pathTotals(paths: readonly DayPath[], day: number | null) {
  return paths.filter((path) => day === null || path.day === day).reduce((totals, path) => ({
    distanceMeters: totals.distanceMeters + path.distanceMeters,
    durationSeconds: totals.durationSeconds + path.durationSeconds,
    segmentCount: totals.segmentCount + path.segmentCount,
    omittedSegments: totals.omittedSegments + path.omittedSegments,
  }), { distanceMeters: 0, durationSeconds: 0, segmentCount: 0, omittedSegments: 0 });
}

export function formatDistance(meters: number, approximate = true) {
  return `${approximate ? "~" : ""}${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}
export function formatTravelTime(seconds: number, approximate = true) {
  const minutes = Math.ceil(seconds / 60);
  return `${approximate ? "~" : ""}${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`}`;
}
