import { z } from "zod";
import type { Itinerary, ItineraryLocation } from "./types.ts";

const MAX_RESPONSE_CHARACTERS = 250_000;
const MAX_JSON_LAYERS = 4;
const MAX_LOCATIONS = 20;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const locationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1_200),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
});

const scheduledLocationSchema = locationSchema.extend({
  order: z.number().int().min(1),
  period: z.enum(["manha", "tarde", "noite"]),
  estimatedDuration: z.string().trim().min(1).max(80),
});

const daySchema = z.object({
  day: z.number().int().min(1).max(7),
  locations: z.array(scheduledLocationSchema).max(MAX_LOCATIONS),
});

const itinerarySchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(2_500),
  locations: z.array(locationSchema).min(1).max(MAX_LOCATIONS * 7),
  days: z.array(daySchema).min(1).max(7),
  estimatedTime: z.string().trim().min(1).max(80).optional(),
  source: z.string().trim().min(1).max(500).optional(),
});

export class ItineraryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItineraryValidationError";
  }
}

const parseJsonString = (value: string) => {
  if (value.length > MAX_RESPONSE_CHARACTERS) {
    throw new ItineraryValidationError("A resposta do gerador excedeu o tamanho permitido.");
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ItineraryValidationError("O gerador retornou um JSON inválido.");
  }
};

const unwrapPayload = (payload: unknown) => {
  let currentValue = payload;

  for (let layer = 0; layer < MAX_JSON_LAYERS; layer += 1) {
    if (typeof currentValue === "string") {
      currentValue = parseJsonString(currentValue);
      continue;
    }

    if (Array.isArray(currentValue)) {
      if (currentValue.length === 0) {
        throw new ItineraryValidationError("O gerador retornou uma lista vazia.");
      }

      currentValue = currentValue[0];
      continue;
    }

    if (isRecord(currentValue) && "output" in currentValue) {
      currentValue = currentValue.output;
      continue;
    }

    return currentValue;
  }

  if (typeof currentValue === "string" || Array.isArray(currentValue)) {
    throw new ItineraryValidationError("A resposta do gerador possui camadas JSON demais.");
  }

  return currentValue;
};

const normalizeText = (value: unknown, fallback: string, maxLength: number) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue.slice(0, maxLength) : fallback;
};

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue.slice(0, maxLength) : undefined;
};

const normalizeCoordinate = (value: unknown, minimum: number, maximum: number) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "string" ? Number(value.trim().replace(",", ".")) : Number(value);

  if (!Number.isFinite(numericValue) || numericValue < minimum || numericValue > maximum) {
    return null;
  }

  return numericValue;
};

const normalizeLocation = (value: unknown, index: number): ItineraryLocation => {
  const location = isRecord(value) ? value : {};

  return locationSchema.parse({
    name: normalizeText(location.nome ?? location.name, `Local ${index + 1}`, 120),
    description: normalizeText(
      location.descricao_curta ?? location.descricao ?? location.description,
      "Descrição não informada pelo gerador.",
      1_200,
    ),
    latitude: normalizeCoordinate(location.latitude ?? location.lat, -90, 90),
    longitude: normalizeCoordinate(location.longitude ?? location.lng ?? location.lon, -180, 180),
  });
};

export const normalizeItineraryResponse = (payload: unknown, expectedDays?: number): Itinerary => {
  const unwrappedPayload = unwrapPayload(payload);

  if (!isRecord(unwrappedPayload)) {
    throw new ItineraryValidationError("A resposta do gerador não contém um roteiro válido.");
  }

  const rawDays = unwrappedPayload.dias ?? unwrappedPayload.days;
  if (!Array.isArray(rawDays) || rawDays.length < 1 || rawDays.length > 7) {
    throw new ItineraryValidationError("O roteiro deve conter entre 1 e 7 dias estruturados.");
  }
  if (expectedDays !== undefined && rawDays.length !== expectedDays) {
    throw new ItineraryValidationError(`O gerador não retornou os ${expectedDays} dias solicitados.`);
  }

  let expectedOrder = 1;
  const periods = { manha: 0, tarde: 1, noite: 2 };
  const days = rawDays.map((value, dayIndex) => {
    const rawDay = isRecord(value) ? value : {};
    const rawLocations = rawDay.locais ?? rawDay.locations;
    if ((rawDay.dia ?? rawDay.day) !== dayIndex + 1 || !Array.isArray(rawLocations)) {
      throw new ItineraryValidationError("Os dias devem estar em sequência, começando pelo Dia 1.");
    }
    let previousPeriod = -1;
    return daySchema.parse({
      day: dayIndex + 1,
      locations: rawLocations.map((value) => {
        const raw = isRecord(value) ? value : {};
        const location = scheduledLocationSchema.parse({
          ...normalizeLocation(value, expectedOrder - 1),
          order: raw.ordem ?? raw.order,
          period: raw.periodo ?? raw.period,
          estimatedDuration: raw.duracao_estimada ?? raw.estimatedDuration,
        });
        if (location.order !== expectedOrder || periods[location.period] < previousPeriod) {
          throw new ItineraryValidationError("A ordem dos locais e dos períodos deve ser sequencial.");
        }
        expectedOrder += 1;
        previousPeriod = periods[location.period];
        return location;
      }),
    });
  });
  const locations = days.flatMap((day) => day.locations);
  if (locations.length === 0) {
    throw new ItineraryValidationError("O roteiro retornado não contém locais nas bases permitidas.");
  }

  return itinerarySchema.parse({
    title: normalizeText(
      unwrappedPayload.titulo ?? unwrappedPayload.title,
      "Roteiro personalizado em Santa Catarina",
      180,
    ),
    description: normalizeText(
      unwrappedPayload.descricao_geral ?? unwrappedPayload.descricao ?? unwrappedPayload.description,
      `Um roteiro com ${locations.length} ${locations.length === 1 ? "local" : "locais"} selecionado pela IA.`,
      2_500,
    ),
    locations,
    days,
    estimatedTime: `${days.length} ${days.length === 1 ? "dia" : "dias"}`,
    source: normalizeOptionalText(unwrappedPayload.fonte ?? unwrappedPayload.source, 500),
  });
};
