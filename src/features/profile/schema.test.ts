import assert from "node:assert/strict";
import test from "node:test";
import { displayNameInputSchema, profileSchema } from "./schema.ts";
import { publicNameSchema } from "../community/schema.ts";

test("nome de exibição aceita acentos e apelidos e remove espaços das extremidades", () => {
  for (const name of ["João Vitor", "Ana", "Maria d'Ávila", "Zé", "Viajante SC"]) {
    assert.equal(displayNameInputSchema.parse(`  ${name}  `), name);
    assert.equal(publicNameSchema.parse(displayNameInputSchema.parse(name)), name);
  }
});

test("nome editável respeita o limite exibido pela comunidade e rejeita nome vazio, e-mail e controles", () => {
  assert.equal(displayNameInputSchema.parse("A".repeat(80)).length, 80);
  for (const name of ["", " ", "A", "A".repeat(81), "ana@example.test", "Ana <ana@example.test>", "Ana\nSilva", "Ana\tSilva", "Ana\u0000Silva"]) {
    assert.equal(displayNameInputSchema.safeParse(name).success, false);
  }
});

test("perfis antigos sem nome continuam legíveis para permitir a edição", () => {
  assert.equal(profileSchema.parse({ full_name: null }).full_name, null);
  assert.equal(profileSchema.parse({ full_name: "" }).full_name, "");
  assert.equal(profileSchema.safeParse(null).success, false);
});
