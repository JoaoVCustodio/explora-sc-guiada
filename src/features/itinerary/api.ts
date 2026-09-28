import { z } from "zod";
import { isCalendarDate, isTripStart } from "../../../supabase/functions/_shared/calendar-date.mjs";
import { clientEnv } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";
import { ItineraryValidationError, normalizeItineraryResponse } from "./schema";
import type { Itinerary, ItineraryRequest } from "./types";

const MAX_RESPONSE_CHARACTERS = 250_000;

const requestSchema = z.object({
  startDate: z.string().refine(isCalendarDate).optional(),
  days: z.number().int().min(1).max(7),
  preferences: z.string().trim().max(300),
  interests: z.array(z.string().trim().min(1).max(60)).max(12),
  regions: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
}).refine(request => request.startDate === undefined || isTripStart(request.startDate, request.days));

type ItineraryErrorCode =
  | "authentication"
  | "definitive"
  | "cancelled"
  | "configuration"
  | "invalid-response"
  | "network"
  | "server"
  | "timeout";

export class ItineraryApiError extends Error {
  readonly code: ItineraryErrorCode;

  constructor(code: ItineraryErrorCode, message: string) {
    super(message);
    this.name = "ItineraryApiError";
    this.code = code;
  }
}

const readServerError = async (response: Response): Promise<ItineraryApiError> => {
  if (response.status === 401) {
    await supabase.auth.signOut({ scope: "local" });
    return new ItineraryApiError("authentication", "Sua sessão expirou. Entre novamente para continuar.");
  }
  const payload = await response.json().catch(() => ({})) as { code?: string };
  const messages: Record<string, string> = {
    no_credits: "Seus créditos acabaram. Seus roteiros salvos e a Comunidade continuam disponíveis.",
    rate_limited: "Muitas tentativas em pouco tempo. Aguarde até uma hora para tentar novamente.",
    failed: "A geração não foi concluída. Seu crédito será liberado em até 2 minutos. Tente menos dias ou outras regiões.",
    conflict: "Esta solicitação já foi utilizada. Inicie uma nova geração.",
    busy: "Já existe uma geração em andamento. Aguarde antes de iniciar outra.",
    reserved: "Seu roteiro ainda está sendo gerado. Aguarde alguns instantes e consulte novamente.",
  };
  const definitive = ["no_credits", "rate_limited", "failed", "conflict", "busy", "invalid_request"].includes(payload.code ?? "");
  return new ItineraryApiError(definitive ? "definitive" : "server", messages[payload.code ?? ""] ?? "Não foi possível confirmar a geração. Consulte novamente para recuperar o resultado sem gastar outro crédito.");
};

export const generateItinerary = async (
  input: ItineraryRequest,
  externalSignal?: AbortSignal,
  requestId: string = crypto.randomUUID(),
): Promise<Itinerary> => {
  const request = requestSchema.parse(input);
  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !data.session?.access_token) {
    await supabase.auth.signOut({ scope: "local" });
    throw new ItineraryApiError(
      "authentication",
      "Sua sessão expirou. Entre novamente para gerar um roteiro.",
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, clientEnv.itineraryTimeoutMs);
  const cancelRequest = () => controller.abort();
  externalSignal?.addEventListener("abort", cancelRequest, { once: true });
  if (externalSignal?.aborted) controller.abort();

  try {
    const functionUrl = new URL(
      `/functions/v1/${encodeURIComponent(clientEnv.itineraryFunctionName)}`,
      clientEnv.supabaseUrl,
    );
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        apikey: clientEnv.supabasePublishableKey,
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        texto: request.preferences,
        interesses: request.interests,
        regioes: request.regions,
        dias: request.days,
        ...(request.startDate ? { data_inicio: request.startDate } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await readServerError(response);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_CHARACTERS) {
      throw new ItineraryApiError("invalid-response", "A resposta do gerador é grande demais.");
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      throw new ItineraryApiError(
        "invalid-response",
        "O gerador não retornou conteúdo. Tente novamente em instantes.",
      );
    }

    if (responseText.length > MAX_RESPONSE_CHARACTERS) {
      throw new ItineraryApiError("invalid-response", "A resposta do gerador é grande demais.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      throw new ItineraryApiError(
        "invalid-response",
        "O gerador retornou uma resposta em formato inválido.",
      );
    }

    try {
      return normalizeItineraryResponse(payload, request.days);
    } catch (error) {
      if (error instanceof ItineraryValidationError || error instanceof z.ZodError) {
        throw new ItineraryApiError("invalid-response", "O roteiro recebido está incompleto. Consulte novamente para recuperar o resultado.");
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof ItineraryApiError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new ItineraryApiError(
        timedOut ? "timeout" : "cancelled",
        timedOut
          ? "A conexão demorou mais que o esperado. Consulte a geração novamente sem gastar outro crédito."
          : "Você parou de aguardar. A geração pode continuar no servidor; consulte o resultado antes de gerar novamente.",
      );
    }

    throw new ItineraryApiError(
      "network",
      "O serviço de roteiros está indisponível ou ainda não foi configurado. Tente novamente mais tarde.",
    );
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", cancelRequest);
  }
};
