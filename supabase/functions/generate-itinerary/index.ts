import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BODY_CHARACTERS = 10_000;
const MAX_RESPONSE_CHARACTERS = 250_000;
const UPSTREAM_TIMEOUT_MS = 30_000;

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

const isStringArray = (value: unknown, maximumItems: number) =>
  Array.isArray(value) &&
  value.length <= maximumItems &&
  value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 80);

Deno.serve(async (request) => {
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

  if (!supabaseUrl || !supabaseKey || !webhookUrl) {
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
  if (
    texto.length > 300 ||
    !isStringArray(body.interesses, 12) ||
    !isStringArray(body.regioes, 8) ||
    (body.regioes as string[]).length === 0
  ) {
    return jsonResponse({ error: "Preferências ou regiões inválidas." }, 400, cors.headers);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

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
        texto,
        interesses: body.interesses,
        regioes: body.regioes,
      }),
      signal: controller.signal,
    });

    if (!upstreamResponse.ok) {
      return jsonResponse(
        { error: "O gerador de roteiros está temporariamente indisponível." },
        502,
        cors.headers,
      );
    }

    const upstreamText = await upstreamResponse.text();
    if (!upstreamText.trim() || upstreamText.length > MAX_RESPONSE_CHARACTERS) {
      return jsonResponse(
        { error: "O gerador retornou uma resposta vazia ou grande demais." },
        502,
        cors.headers,
      );
    }

    let upstreamPayload: unknown;
    try {
      upstreamPayload = JSON.parse(upstreamText) as unknown;
    } catch {
      return jsonResponse(
        { error: "O gerador retornou uma resposta em formato inválido." },
        502,
        cors.headers,
      );
    }

    return new Response(JSON.stringify(upstreamPayload), {
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
        error: isTimeout
          ? "O gerador demorou mais que o limite de 30 segundos."
          : "Não foi possível conectar ao gerador de roteiros.",
      },
      isTimeout ? 504 : 502,
      cors.headers,
    );
  } finally {
    clearTimeout(timeoutId);
  }
});
