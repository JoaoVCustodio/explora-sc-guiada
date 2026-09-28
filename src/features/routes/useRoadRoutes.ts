import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ItineraryDay } from "../itinerary/types";
import { calculatePaths, isCoordinate, mergeRoadPaths } from "./model";
import { CACHE_TTL, readCache, routeKey, writeCache } from "./cache";
import { parseRoadRoute, type Coordinate, type RoadRoute } from "../../../supabase/functions/route-osrm/contract";

const inflight = new Map<string, Promise<RoadRoute | null>>();
const EMPTY_ROUTES: Record<number, RoadRoute | null> = {};
const memory = new Map<string, { until: number; route: RoadRoute | null }>();
let queue: Promise<unknown> = Promise.resolve();
function getRoute(coordinates: Coordinate[]): Promise<RoadRoute | null> {
  const key = routeKey(coordinates);
  const cached = memory.get(key);
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.route);
  try { const saved = readCache(localStorage, key); if (saved) return Promise.resolve(saved); } catch { /* unavailable */ }
  const pending = inflight.get(key); if (pending) return pending;
  const task = queue.then(async () => {
    let route: RoadRoute | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("route-osrm", { body: { coordinates }, signal: AbortSignal.timeout(16000) });
      if (!error) { route = parseRoadRoute(data); try { writeCache(localStorage, key, route); } catch { /* unavailable */ } }
    } catch { /* This day retains its local fallback. */ }
    if (memory.size >= 30) memory.delete(memory.keys().next().value!);
    memory.set(key, { route, until: Date.now() + (route ? CACHE_TTL : 60000) });
    return route;
  });
  queue = task.then(() => new Promise(resolve => setTimeout(resolve, 1100)));
  inflight.set(key, task);
  void task.finally(() => inflight.delete(key));
  return task;
}
export function useRoadRoutes(days: ItineraryDay[]) {
  const fallback = useMemo(() => calculatePaths(days), [days]);
  const [resolved, setResolved] = useState<{ days: ItineraryDay[]; routes: Record<number, RoadRoute | null> }>({ days, routes: {} });
  const routes = resolved.days === days ? resolved.routes : EMPTY_ROUTES;
  useEffect(() => {
    let disposed = false;
    for (const day of days) {
      const coordinates = day.locations.map(p => [p.longitude, p.latitude]);
      if (coordinates.length < 2 || coordinates.length > 20 || !coordinates.every(isCoordinate)) continue;
      void getRoute(coordinates).then(route => {
        if (!disposed) setResolved(previous => ({ days, routes: { ...(previous.days === days ? previous.routes : {}), [day.day]: route } }));
      });
    }
    return () => { disposed = true; };
  }, [days]);
  return useMemo(() => mergeRoadPaths(fallback, routes), [fallback, routes]);
}
