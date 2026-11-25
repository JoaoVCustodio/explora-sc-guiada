import { z } from "zod";

export const DISPLAY_NAME_LIMIT = 80;

export const displayNameInputSchema = z.string().trim()
  .min(2, "Use pelo menos 2 caracteres para o nome.")
  .max(DISPLAY_NAME_LIMIT, "Use até 80 caracteres para o nome.")
  .refine((name) => !name.includes("@"), "Use um nome ou apelido, sem e-mail.")
  .refine((name) => !/\p{Cc}/u.test(name), "Informe o nome em uma única linha.");

export const profileSchema = z.object({ full_name: z.string().nullable() });
