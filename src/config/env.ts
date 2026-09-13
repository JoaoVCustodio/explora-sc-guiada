const requireClientEnv = (name: keyof ImportMetaEnv, value: string | undefined) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `Configuração ausente: ${name}. Copie .env.example para .env.local e informe o valor correspondente.`,
    );
  }

  return normalizedValue;
};

const parseTimeout = (value: string | undefined) => {
  const parsedValue = Number(value);

  if (!value?.trim() || !Number.isFinite(parsedValue)) {
    return 65_000;
  }

  return Math.min(Math.max(parsedValue, 5_000), 65_000);
};

export const clientEnv = {
  supabaseUrl: requireClientEnv("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: requireClientEnv(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
  itineraryFunctionName: import.meta.env.VITE_ITINERARY_FUNCTION_NAME?.trim() || "generate-itinerary",
  itineraryTimeoutMs: parseTimeout(import.meta.env.VITE_ITINERARY_TIMEOUT_MS),
} as const;
