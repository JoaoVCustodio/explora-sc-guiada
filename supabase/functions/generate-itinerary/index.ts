import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeItineraryResponse } from "../_shared/itinerary-schema.ts";
import { isTripStart } from "../_shared/calendar-date.mjs";

const MAX_BODY_CHARACTERS = 10_000;
const MAX_RESPONSE_CHARACTERS = 250_000;
const UPSTREAM_TIMEOUT_MS = 60_000;

const ALLOWED_REGIONS = new Set([
  "Grande Florianópolis",
  "Serra Catarinense",
  "Litoral Norte",
  "Vale Europeu",
  "Oeste Catarinense",
  "Sul Catarinense",
  "Planalto Norte",
]);
const ALLOWED_INTERESTS = new Set([
  "praias",
  "montanhas",
  "gastronomia",
  "arte",
  "esportes",
  "ecoturismo",
]);

type JsonRecord = Record<string, unknown>;

const jsonResponse = (body: JsonRecord, status: number, corsHeaders: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigin =
    configuredOrigins.length === 0
      ? "*"
      : configuredOrigins.includes(origin)
        ? origin
        : "";

  return {
    allowed: allowedOrigin !== "",
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  };
};

const isStringArray = (value: unknown, maximumItems: number, allowedValues: ReadonlySet<string>) =>
  Array.isArray(value) &&
  value.length <= maximumItems &&
  value.every((item) =>
    typeof item === "string" && item.trim().length > 0 && item.length <= 80 && allowedValues.has(item)
  );

export const handler = async (request: Request) => {
  const cors = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: cors.allowed ? 204 : 403,
      headers: cors.headers,
    });
  }

  if (!cors.allowed) {
    return jsonResponse({ error: "Origem não autorizada." }, 403, cors.headers);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405, cors.headers);
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return jsonResponse({ error: "Autenticação necessária." }, 401, cors.headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey || !webhookUrl || !serviceKey) {
    return jsonResponse({ error: "Integração não configurada no servidor." }, 500, cors.headers);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return jsonResponse({ error: "Sessão inválida ou expirada." }, 401, cors.headers);
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > MAX_BODY_CHARACTERS) {
    return jsonResponse({ error: "Dados da solicitação inválidos." }, 400, cors.headers);
  }

  let body: JsonRecord;
  try {
    const parsedBody = JSON.parse(rawBody) as unknown;
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
      throw new Error("Invalid body");
    }
    body = parsedBody as JsonRecord;
  } catch {
    return jsonResponse({ error: "JSON da solicitação inválido." }, 400, cors.headers);
  }

  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  if (typeof body.dias !== "number" || !Number.isInteger(body.dias) || body.dias < 1 || body.dias > 7) {
    return jsonResponse({ error: "A quantidade de dias deve ser um inteiro entre 1 e 7." }, 400, cors.headers);
  }
  if (
    texto.length > 300 ||
    !isStringArray(body.interesses, 12, ALLOWED_INTERESTS) ||
    !isStringArray(body.regioes, 8, ALLOWED_REGIONS) ||
    (body.regioes as string[]).length === 0
  ) {
    return jsonResponse({ error: "Preferências ou regiões inválidas." }, 400, cors.headers);
  }

  const requestId = body.requestId;
  if (body.data_inicio !== undefined && !isTripStart(body.data_inicio, body.dias)) {
    return jsonResponse({ error: "Informe uma data de início válida.", code: "invalid_request" }, 400, cors.headers);
  }
  const dateInput = body.data_inicio === undefined ? {} : { data_inicio: body.data_inicio as string };
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return jsonResponse({ error: "Solicitação inválida.", code: "invalid_request" }, 400, cors.headers);
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const input = { texto, interesses: body.interesses, regioes: body.regioes, dias: body.dias, ...dateInput };
  const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
  const hash = Array.from(new Uint8Array(hashBytes), b => b.toString(16).padStart(2, "0")).join("");
  const { data: reservation, error: reserveError } = await admin.rpc("reserve_generation_credit", {
    p_user: userData.user.id, p_id: requestId, p_hash: hash,
  });
  if (reserveError || !reservation) return jsonResponse({ code: "unavailable", error: "Não foi possível verificar seus créditos. Tente novamente." }, 503, cors.headers);
  if (reservation.status === "completed") return jsonResponse(reservation.result, 200, cors.headers);
  if (reservation.status !== "acquired") {
    const status = reservation.status;
    const messages: Record<string, string> = {
      no_credits: "Seus créditos acabaram. Seus roteiros salvos continuam disponíveis.",
      busy: "Já existe uma geração em andamento. Aguarde antes de tentar novamente.",
      reserved: "Seu roteiro ainda está sendo gerado. Aguarde e consulte novamente.",
      failed: "Esta geração não foi concluída. O crédito está disponível para uma nova tentativa.",
      conflict: "Esta solicitação já foi utilizada. Inicie uma nova geração.",
      rate_limited: "Você fez muitas tentativas. Aguarde até uma hora para gerar novamente.",
    };
    return jsonResponse({ code: status, error: messages[status] ?? "Não foi possível iniciar a geração." },
      status === "no_credits" ? 402 : status === "rate_limited" ? 429 : 409, cors.headers);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let finishing = false;

  try {
    const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json" };
    const webhookToken = Deno.env.get("N8N_WEBHOOK_TOKEN");
    if (webhookToken) {
      upstreamHeaders["X-ExploraSC-Token"] = webhookToken;
    }

    const upstreamResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({
        requestId,
        texto,
        interesses: body.interesses,
        regioes: body.regioes,
        dias: body.dias,
        ...dateInput,
      }),
      signal: controller.signal,
    });

    if (!upstreamResponse.ok) {
      return jsonResponse(
        { code: "failed", error: "O gerador de roteiros está temporariamente indisponível." },
        502,
        cors.headers,
      );
    }

    const upstreamText = await upstreamResponse.text();
    if (!upstreamText.trim() || upstreamText.length > MAX_RESPONSE_CHARACTERS) {
      return jsonResponse(
        { code: "failed", error: "O gerador não retornou um roteiro completo." },
        502,
        cors.headers,
      );
    }

    let upstreamPayload: unknown;
    try {
      upstreamPayload = JSON.parse(upstreamText) as unknown;
    } catch {
      return jsonResponse(
        { code: "failed", error: "O gerador não retornou um roteiro completo." },
        502,
        cors.headers,
      );
    }

    let normalized;
    try {
      normalized = normalizeItineraryResponse(upstreamPayload, body.dias, dateInput.data_inicio ?? null);
      if (JSON.stringify(normalized).length > MAX_RESPONSE_CHARACTERS) throw new Error("Normalized result too large");
    } catch {
      return jsonResponse({ code: "failed", error: "Não encontramos locais suficientes para todos os dias. Tente menos dias ou outras regiões. Seu crédito será devolvido." }, 502, cors.headers);
    }
    // Once finalization starts, its outcome may be uncertain on a network failure.
    // Never refund blindly: replaying this request reads the committed result.
    finishing = true;
    const { data: completed, error: finishError } = await admin.rpc("finish_generation_credit", {
      p_user: userData.user.id, p_id: requestId, p_result: normalized,
    });
    if (finishError || !completed) return jsonResponse({ code: "unavailable", error: "Não foi possível confirmar o resultado. Consulte esta geração novamente." }, 503, cors.headers);
    if (completed.status !== "completed") return jsonResponse({ code: "failed", error: "A geração expirou e o crédito foi devolvido. Tente novamente." }, 504, cors.headers);
    return new Response(JSON.stringify(completed.result), {
      status: 200,
      headers: {
        ...cors.headers,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return jsonResponse(
      {
        code: finishing ? "unavailable" : "failed",
        error: isTimeout
          ? "A geração ultrapassou 60 segundos. Seu crédito será liberado para tentar novamente."
          : "Não foi possível conectar ao gerador de roteiros.",
      },
      isTimeout ? 504 : 502,
      cors.headers,
    );
  } finally {
    clearTimeout(timeoutId);
    if (!finishing) {
      // A crash or a failed refund is recovered by the 120-second lease in SQL.
      try { await admin.rpc("finish_generation_credit", { p_user: userData.user.id, p_id: requestId, p_result: null }); } catch { /* Lease recovers the reservation. */ }
    }
  }
};

if (import.meta.main) Deno.serve(handler);
