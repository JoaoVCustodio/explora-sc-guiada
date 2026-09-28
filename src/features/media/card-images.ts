export interface ResolvedCardImage {
  src: string;
  fallbackSrc: string;
  isIllustrative: boolean;
}

interface AttractionImageInput {
  name: string;
  description?: string;
  imageUrl?: string | null;
  categories?: readonly string[];
}

interface PartnerImageInput {
  name: string;
  description?: string;
  imageUrl?: string | null;
}

interface OptionalMediaFields {
  imageUrl?: string;
  categories: string[];
}

const images = {
  coast: "/placeholders/attraction-coast.webp",
  mountain: "/placeholders/attraction-mountain.webp",
  gastronomy: "/placeholders/attraction-gastronomy.webp",
  culture: "/placeholders/attraction-culture.webp",
  water: "/placeholders/attraction-water.webp",
  ecotourism: "/placeholders/attraction-ecotourism.webp",
  hospitality: "/placeholders/partner-hospitality.webp",
  wellness: "/placeholders/partner-wellness.webp",
} as const;

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR");

const includesAny = (text: string, terms: readonly string[]) => terms.some((term) => text.includes(term));

function attractionFallback(text: string) {
  if (includesAny(text, ["gastronomia", "gastronomico", "restaurante", "cafeteria", "cafe", "comida", "culinaria", "prato", "cervejaria", "vinicola"])) return images.gastronomy;
  if (includesAny(text, ["museu", "igreja", "historico", "historia", "cultural", "cultura", "arte", "arquitetura", "patrimonio", "galeria"])) return images.culture;
  if (includesAny(text, ["caiaque", "kayak", "surf", "prancha", "mergulho", "aquatico", "nautico", "barco", "vela", "lago"])) return images.water;
  if (includesAny(text, ["cachoeira", "mata", "floresta", "parque", "ecoturismo", "reserva", "bosque", "fauna", "flora"])) return images.ecotourism;
  if (includesAny(text, ["montanha", "serra", "mirante", "aventura", "rapel", "escalada", "trilha", "canion", "morro"])) return images.mountain;
  if (includesAny(text, ["praia", "mar", "litoral", "natureza", "ilha", "costao", "duna", "lagoa", "paisagem"])) return images.coast;
  return undefined;
}

function partnerFallback(text: string) {
  if (includesAny(text, ["pousada", "hospedagem", "hotel", "hostel", "chale", "suite", "quarto", "resort"])) return images.hospitality;
  if (includesAny(text, ["clinica", "estetica", "spa", "bem-estar", "bem estar", "saude", "massagem", "terapia"])) return images.wellness;
  if (includesAny(text, ["restaurante", "cafeteria", "cafe", "gastronomia", "comida", "bistro", "bar", "padaria"])) return images.gastronomy;
  return images.coast;
}

export function safeCardImageUrl(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function resolveAttractionImage({ name, description = "", imageUrl, categories = [] }: AttractionImageInput): ResolvedCardImage {
  const primaryCategory = categories.find(Boolean);
  const fallbackSrc = (primaryCategory ? attractionFallback(normalize(primaryCategory)) : undefined)
    ?? attractionFallback(normalize(`${name} ${description}`))
    ?? images.coast;
  const realImage = safeCardImageUrl(imageUrl);
  return realImage
    ? { src: realImage, fallbackSrc, isIllustrative: false }
    : { src: fallbackSrc, fallbackSrc, isIllustrative: true };
}

export function resolvePartnerImage({ name, description = "", imageUrl }: PartnerImageInput): ResolvedCardImage {
  const fallbackSrc = partnerFallback(normalize(`${name} ${description}`));
  const realImage = safeCardImageUrl(imageUrl);
  return realImage
    ? { src: realImage, fallbackSrc, isIllustrative: false }
    : { src: fallbackSrc, fallbackSrc, isIllustrative: true };
}

export function optionalMediaFields(value: unknown): OptionalMediaFields {
  if (!value || typeof value !== "object") return { categories: [] };
  const record = value as Record<string, unknown>;
  const rawImage = record.image_url ?? record.imageUrl;
  const rawCategories = record.categories ?? record.types ?? record.category ?? record.type;
  const categories = Array.isArray(rawCategories)
    ? rawCategories.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : typeof rawCategories === "string" && rawCategories.trim()
      ? [rawCategories]
      : [];
  return {
    imageUrl: typeof rawImage === "string" ? rawImage : undefined,
    categories,
  };
}
