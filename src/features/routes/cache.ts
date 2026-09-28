import { parseRoadRoute, type Coordinate, type RoadRoute } from "../../../supabase/functions/route-osrm/contract.ts";
export const CACHE_KEY = "explorasc:road-routes:v1";
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
export const routeKey = (coordinates: Coordinate[]) => JSON.stringify(coordinates);
type Entry = { key: string; expires: number; route: RoadRoute };
export function readCache(storage: Pick<Storage, "getItem">, key: string, now = Date.now()): RoadRoute | null {
  try {
    const entries: Entry[] = JSON.parse(storage.getItem(CACHE_KEY) ?? "[]");
    const entry = entries.find(e => e.key === key && e.expires > now && e.expires <= now + CACHE_TTL);
    return entry ? parseRoadRoute(entry.route) : null;
  } catch { return null; }
}
export function writeCache(storage: Pick<Storage, "getItem" | "setItem">, key: string, route: RoadRoute, now = Date.now()) {
  try {
    let entries: Entry[];
    try { entries = JSON.parse(storage.getItem(CACHE_KEY) ?? "[]"); if (!Array.isArray(entries)) entries = []; } catch { entries = []; }
    entries = [{ key, route: parseRoadRoute(route), expires: now + CACHE_TTL }, ...entries.filter(e => e.key !== key && e.expires > now)].slice(0, 30);
    while (JSON.stringify(entries).length > 1_000_000 && entries.length) entries.pop();
    storage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch { /* Storage disabled/full: routing still works. */ }
}
