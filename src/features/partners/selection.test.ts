import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PARTNER_REGIONS, partnerRegions, safePartnerUrl, selectPartners, type Partner } from "./selection.ts";

const fixture = (id: string, region: string = PARTNER_REGIONS[0], active = true): Partner => ({
  id, region, active, name: "Demonstração", description: "Fixture de teste", city: "Cidade",
  image_url: null, neighborhood: null, whatsapp_url: null, instagram_url: null,
  is_demo: true, created_at: "2026-09-14T00:00:00Z",
});

test("distribui entre regiões antes de repetir e limita a três", () => {
  const a = PARTNER_REGIONS[0], b = PARTNER_REGIONS[3];
  const partners = [fixture("a1"), fixture("a2"), fixture("a3"), fixture("b1", b)];
  assert.deepEqual(selectPartners(partners, [a, b]).map((p) => p.id), ["a1", "b1", "a2"]);
});
test("exclui inativos e outras regiões, sem duplicar IDs ou regiões", () => {
  const p = fixture("a");
  assert.deepEqual(selectPartners([p, p, fixture("off", PARTNER_REGIONS[0], false), fixture("b", PARTNER_REGIONS[1])], [p.region, p.region]), [p]);
  assert.deepEqual(selectPartners([p], []), []);
  assert.deepEqual(selectPartners([p], [PARTNER_REGIONS[1]]), []);
  assert.deepEqual(partnerRegions(["arbitrária", p.region, p.region]), [p.region]);
});
test("mais de três regiões respeita limite e ordem de seleção; regiões vazias não ocupam vagas", () => {
  const partners = PARTNER_REGIONS.slice(1).map((region, i) => fixture(String(i), region));
  assert.deepEqual(selectPartners(partners, PARTNER_REGIONS).map((p) => p.id), ["0", "1", "2"]);
});
test("links permitem somente HTTPS e domínios sociais exatos", () => {
  assert.equal(safePartnerUrl("https://wa.me/5548999999999", "whatsapp"), "https://wa.me/5548999999999");
  assert.equal(safePartnerUrl("https://www.instagram.com/exemplo/", "instagram"), "https://www.instagram.com/exemplo/");
  for (const url of ["javascript:alert(1)", "http://wa.me/1", "https://wa.me.evil.test/1", "https://user:pass@wa.me/1", "https://wa.me:444/1", "inválido"]) {
    assert.equal(safePartnerUrl(url, "whatsapp"), undefined);
  }
  assert.equal(safePartnerUrl(null, "image"), undefined);
  assert.equal(safePartnerUrl("https://example.com/photo.jpg", "image"), "https://example.com/photo.jpg");
});
test("regiões da seleção e constraint permanecem iguais às opções atuais do formulário", () => {
  const form = readFileSync(new URL("../../components/RegionsMultiSelect.tsx", import.meta.url), "utf8");
  const values = [...form.matchAll(/value: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...PARTNER_REGIONS], values);
  const migration = readFileSync(new URL("../../../supabase/migrations/20260914040000_create_partners.sql", import.meta.url), "utf8");
  for (const region of values) assert.ok(migration.includes(`'${region}'`));
});
