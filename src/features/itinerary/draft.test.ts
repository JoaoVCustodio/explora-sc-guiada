import assert from "node:assert/strict";
import test from "node:test";
import { clearPending, readPending, writePending } from "../credits/pending.ts";
import { readDraft, writeDraft, type ItineraryDraft } from "./draft.ts";
import { normalizeItineraryResponse } from "./schema.ts";

const draft = (id = "11111111-1111-4111-8111-111111111111"): ItineraryDraft => ({
  id,
  input: { days: 1, preferences: "Praias tranquilas", interests: ["Praias"], regions: ["Grande Florianópolis"], startDate: "2026-11-16" },
  itinerary: normalizeItineraryResponse({
    titulo: "Um dia em Florianópolis", descricao_geral: "Passeio pelas praias.",
    dias: [{ dia: 1, locais: [{ ordem: 1, periodo: "manha", nome: "Praia", descricao_curta: "Orla.", duracao_estimada: "2h", latitude: -27.59, longitude: -48.55 }] }],
  }, 1),
});

function withStorage(run: (entries: Map<string, string>, storage: Storage) => void) {
  const entries = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage: Storage = {
    get length() { return entries.size; },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    removeItem: (key) => { entries.delete(key); },
    clear: () => entries.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try { run(entries, storage); } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("roteiro concluído sobrevive à saída da página mantendo pedido, data e resultado", () => withStorage(() => {
  const value = draft();
  writePending("owner", { id: value.id, input: value.input });
  writeDraft("owner", value);
  clearPending("owner", value.id);
  assert.equal(readPending("owner"), null);
  assert.deepEqual(readDraft("owner"), value);
  assert.deepEqual(readDraft("owner"), value, "consultar de novo não muda a identidade usada para salvar");
  assert.equal(readDraft("another-user"), null, "outra conta não pode receber o rascunho");
}));

test("somente uma nova geração concluída substitui o último rascunho", () => withStorage(() => {
  const previous = draft();
  const next = draft("22222222-2222-4222-8222-222222222222");
  writeDraft("owner", previous);
  writePending("owner", { id: next.id, input: next.input });
  assert.deepEqual(readDraft("owner"), previous);
  clearPending("owner", next.id);
  assert.deepEqual(readDraft("owner"), previous, "uma falha na nova solicitação não remove o roteiro anterior");
  writeDraft("owner", next);
  assert.deepEqual(readDraft("owner"), next);
}));

test("falha de armazenamento preserva solicitação para consulta e rascunho anterior", () => withStorage((_entries, storage) => {
  const previous = draft();
  const next = draft("22222222-2222-4222-8222-222222222222");
  writeDraft("owner", previous);
  writePending("owner", { id: next.id, input: next.input });
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.throws(() => writeDraft("owner", next));
  assert.deepEqual(readPending("owner"), { id: next.id, input: next.input });
  assert.deepEqual(readDraft("owner"), previous);
}));

test("rascunhos corrompidos, incompletos ou com quantidade errada de dias não são exibidos", () => withStorage((entries) => {
  const value = draft();
  for (const stored of ["invalid json", JSON.stringify({ ...value, itinerary: {} }), JSON.stringify({ ...value, input: { ...value.input, days: 2 } })]) {
    entries.set("explorasc:itinerary-draft:owner", stored);
    assert.equal(readDraft("owner"), null);
  }
  writeDraft("owner", value);
  assert.throws(() => writeDraft("owner", { ...value, itinerary: { ...value.itinerary, days: [] } }));
  assert.deepEqual(readDraft("owner"), value);
}));

test("armazenamento bloqueado não impede abrir as outras páginas", () => withStorage((_entries, storage) => {
  storage.getItem = () => { throw new Error("SecurityError"); };
  assert.equal(readDraft("owner"), null);
}));
