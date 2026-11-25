import { supabase } from "@/integrations/supabase/client";
import { displayNameInputSchema, profileSchema } from "./schema";

export const PROFILE_CHANGED_EVENT = "explorasc:profile-changed";
export interface ProfileChange { userId: string; fullName: string }

export async function getProfileName(userId: string, signal: AbortSignal) {
  const { data, error } = await supabase.from("profiles").select("full_name")
    .eq("id", userId).abortSignal(signal).single();
  if (error || !data) throw new Error("Não foi possível carregar seu nome. Tente novamente.");
  return profileSchema.parse(data).full_name;
}

export async function updateProfileName(userId: string, input: string) {
  const fullName = displayNameInputSchema.parse(input);
  const { data, error } = await supabase.from("profiles").update({ full_name: fullName })
    .eq("id", userId).select("full_name").single();
  if (error || !data) throw new Error("Não foi possível salvar seu nome. Verifique sua conexão e tente novamente.");
  const savedName = profileSchema.parse(data).full_name;
  if (savedName === null) throw new Error("Não foi possível confirmar a alteração do nome. Tente novamente.");
  window.dispatchEvent(new CustomEvent<ProfileChange>(PROFILE_CHANGED_EVENT, { detail: { userId, fullName: savedName } }));
  return savedName;
}
