import type { Tables } from "../../integrations/supabase/types.ts";

export type Partner = Tables<"partners">;
export const PARTNER_REGIONS = [
  "Grande Florianópolis", "Serra Catarinense", "Litoral Norte", "Vale Europeu",
  "Oeste Catarinense", "Sul Catarinense", "Planalto Norte",
] as const;

export function partnerRegions(regions: readonly string[]): string[] {
  return [...new Set(regions)].filter((region) => PARTNER_REGIONS.some((allowed) => allowed === region));
}

/** One partner per region per round; stable input order, no commercial ranking. */
export function selectPartners(partners: readonly Partner[], regions: readonly string[]): Partner[] {
  const groups = partnerRegions(regions).map((region) => partners.filter((p) => p.active && p.region === region));
  const selected: Partner[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < Math.max(0, ...groups.map((group) => group.length)); round++) {
    for (const group of groups) {
      const partner = group[round];
      if (partner && !seen.has(partner.id)) {
        selected.push(partner);
        seen.add(partner.id);
        if (selected.length === 3) return selected;
      }
    }
  }
  return selected;
}

export function safePartnerUrl(value: string | null, kind: "image" | "whatsapp" | "instagram"): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    const hosts = kind === "whatsapp" ? ["wa.me", "api.whatsapp.com", "www.whatsapp.com"] : ["instagram.com", "www.instagram.com"];
    if (kind !== "image" && !hosts.includes(url.hostname)) return undefined;
    return url.href;
  } catch { return undefined; }
}
