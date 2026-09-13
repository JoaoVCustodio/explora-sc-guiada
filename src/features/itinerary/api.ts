import { z } from "zod";
import { clientEnv } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";
import { ItineraryValidationError, normalizeItineraryResponse } from "./schema";
import type { Itinerary, ItineraryRequest } from "./types";

const MAX_RESPONSE_CHARACTERS = 250_000;

const requestSchema = z.object({
  preferences: z.string().trim().max(300),
  interests: z.array(z.string().trim().min(1).max(60)).max(12),
  regions: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});

type ItineraryErrorCode =
  | "authentication"
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

const readServerError = async (response: Response) => {
  const responseText = await response.text();

  if (!responseText) {
    return "O serviço de roteiros não respondeu como esperado.";
  }

  try {
    const parsedResponse = JSON.parse(responseText) as { error?: unknown };
    return typeof parsedResponse.error === "string"
      ? parsedResponse.error
      : "O serviço de roteiros não respondeu como esperado.";
  } catch {
    return "O serviço de roteiros não respondeu como esperado.";
  }
};

export const generateItinerary = async (
  input: ItineraryRequest,
  externalSignal?: AbortSignal,
): Promise<Itinerary> => {
  const request = requestSchema.parse(input);
  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !data.session?.access_token) {
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
        texto: request.preferences,
        interesses: request.interests,
        regioes: request.regions,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ItineraryApiError("server", await readServerError(response));
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
      return normalizeItineraryResponse(payload);
    } catch (error) {
      if (error instanceof ItineraryValidationError || error instanceof z.ZodError) {
        throw new ItineraryApiError("invalid-response", error.message);
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
          ? "A geração demorou mais que o esperado. Tente novamente."
          : "A geração do roteiro foi cancelada.",
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
