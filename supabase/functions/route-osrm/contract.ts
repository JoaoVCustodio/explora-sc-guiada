export type Coordinate = [number, number];
export const validCoordinate = (v: unknown): v is Coordinate => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
export function routeCoordinates(value: unknown): Coordinate[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20 || !value.every(validCoordinate)) throw new Error("Invalid coordinates");
  return value;
}
export interface RoadRoute { geometry: { type: "LineString"; coordinates: Coordinate[] }; distanceMeters: number; durationSeconds: number }
export function parseRoadRoute(value: unknown): RoadRoute {
  const v = value as RoadRoute;
  if (!v || v.geometry?.type !== "LineString" || !Array.isArray(v.geometry.coordinates) || v.geometry.coordinates.length < 2 || v.geometry.coordinates.length > 50000 || !v.geometry.coordinates.every(validCoordinate) || !Number.isFinite(v.distanceMeters) || v.distanceMeters < 0 || !Number.isFinite(v.durationSeconds) || v.durationSeconds < 0) throw new Error("Invalid route");
  return { geometry: v.geometry, distanceMeters: v.distanceMeters, durationSeconds: v.durationSeconds };
}
export function parseOSRM(value: unknown): RoadRoute {
  const v = value as { code?: string; routes?: { geometry: RoadRoute["geometry"]; distance: number; duration: number }[] };
  if (v?.code !== "Ok" || !v.routes?.[0]) throw new Error("Route unavailable");
  const route = v.routes[0];
  return parseRoadRoute({ geometry: route.geometry, distanceMeters: route.distance, durationSeconds: route.duration });
}
export const routeUrl = (coordinates: Coordinate[]) => `https://router.project-osrm.org/route/v1/driving/${routeCoordinates(coordinates).map(p => p.join(",")).join(";")}?overview=full&geometries=geojson&steps=false&alternatives=false&generate_hints=false`;
