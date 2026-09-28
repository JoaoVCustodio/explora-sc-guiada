import { createClient } from "npm:@supabase/supabase-js@2";
import { parseOSRM, routeCoordinates, routeUrl } from "./contract.ts";

// Per-isolate rate gate; public demo is not intended for production load.
let nextRequest = 0;
Deno.serve(async (request) => {
  const origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(v => v.trim()).filter(Boolean);
  const origin = request.headers.get("origin") ?? "";
  const headers = { "Access-Control-Allow-Origin": origins.length ? (origins.includes(origin) ? origin : "") : "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origins.length && !origins.includes(origin)) return reply({ error: "Origem não autorizada." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return reply({ error: "Autenticação necessária." }, 401);
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return reply({ error: "Autenticação necessária." }, 401);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Entrada inválida." }, 400);
    let text = "", bytes = 0;
    const decoder = new TextDecoder();
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return reply({ error: "Entrada muito grande." }, 413); }
      text += decoder.decode(part.value, { stream: true });
    }
    let coordinates;
    try { coordinates = routeCoordinates(JSON.parse(text + decoder.decode()).coordinates); }
    catch { return reply({ error: "Coordenadas inválidas." }, 400); }
    const now = Date.now();
    if (now < nextRequest) return reply({ error: "Serviço ocupado." }, 429);
    nextRequest = now + 1100;
    const response = await fetch(routeUrl(coordinates), { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "ExploraSC/1.0 (itinerary routing)" } });
    if (!response.ok) { console.warn("route-osrm upstream", response.status); return reply({ error: "Trajeto indisponível." }, 502); }
    const stream = response.body?.getReader();
    if (!stream) throw new Error("Empty response");
    let output = "", size = 0;
    const decode = new TextDecoder();
    while (true) {
      const part = await stream.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 4_000_000) { await stream.cancel(); throw new Error("Response limit"); }
      output += decode.decode(part.value, { stream: true });
    }
    return reply(parseOSRM(JSON.parse(output + decode.decode())));
  } catch { console.warn("route-osrm: unavailable or invalid upstream response"); return reply({ error: "Trajeto indisponível." }, 502); }
});
