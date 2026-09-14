import { supabase } from "@/integrations/supabase/client";
import { partnerRegions, selectPartners } from "./selection";

export async function getPartners(regions: readonly string[], signal: AbortSignal) {
  // Limit per region, not globally: a populous region must not hide the others.
  const groups = await Promise.all(partnerRegions(regions).map(async (region) => {
    const { data, error } = await supabase.from("partners").select("*")
      .eq("active", true).eq("region", region)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .limit(3).abortSignal(signal);
    if (error) throw new Error("Não foi possível carregar os parceiros.");
    return data ?? [];
  }));
  return selectPartners(groups.flat(), regions);
}
