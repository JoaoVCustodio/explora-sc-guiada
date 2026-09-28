import assert from "node:assert/strict";
import { handler } from "./index.ts";

const valid = { titulo: "Teste", dias: [{ dia: 1, locais: [{ nome: "Praia", descricao_curta: "Teste", ordem: 1, periodo: "manha", duracao_estimada: "1h", latitude: -27, longitude: -48 }] }] };
const input = { requestId: "11111111-1111-4111-8111-111111111111", dias: 1, texto: "", interesses: [], regioes: ["Grande Florianópolis"] };
const request = (authenticated = true, data: typeof input & {data_inicio?: unknown} = input) => new Request("https://edge.test/generate-itinerary", {
  method: "POST", headers: authenticated ? { Authorization: "Bearer test-token" } : {}, body: JSON.stringify(data),
});

Deno.test("generation boundary: authentication, credits, failures and replay", async t => {
  const originalFetch = globalThis.fetch;
  const environment = { SUPABASE_URL: "https://supabase.test", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service", N8N_WEBHOOK_URL: "https://upstream.test", ALLOWED_ORIGINS: "" };
  const previous = Object.fromEntries(Object.keys(environment).map(key => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(environment)) Deno.env.set(key, value);
  let reservation = "acquired";
  let upstream: unknown = valid;
  let upstreamStatus = 200;
  let timeout = false;
  let authStatus = 200;
  let finishFails = false;
  let upstreamCalls = 0;
  let reserveCalls = 0;
  let lastInput: Record<string, unknown> = {};
  const hashes: string[] = [];
  let finalizations: unknown[] = [];
  globalThis.fetch = async (url, init) => {
    const address = String(url);
    if (address.includes("/auth/v1/user")) return Response.json({ id: "22222222-2222-4222-8222-222222222222" }, { status: authStatus });
    if (address.endsWith("/reserve_generation_credit")) { reserveCalls++; hashes.push(JSON.parse(String(init?.body)).p_hash); return Response.json({ status: reservation, result: reservation === "completed" ? valid : null }); }
    if (address.endsWith("/finish_generation_credit")) {
      const args = JSON.parse(String(init?.body));
      finalizations.push(args.p_result);
      if (finishFails) return Response.json({ message: "internal database detail" }, { status: 500 });
      return Response.json({ status: args.p_result ? "completed" : "failed", result: args.p_result });
    }
    if (address === "https://upstream.test") {
      lastInput = JSON.parse(String(init?.body));
      assert.equal(JSON.parse(String(init?.body)).requestId, input.requestId);
      upstreamCalls++;
      if (timeout) throw new DOMException("secret timeout detail", "AbortError");
      return Response.json(upstream, { status: upstreamStatus });
    }
    throw new Error(`Unexpected fetch ${address}`);
  };
  try {
    await t.step("unauthenticated and expired requests never reserve or invoke AI", async () => {
      assert.equal((await handler(request(false))).status, 401);
      authStatus = 401;
      assert.equal((await handler(request())).status, 401);
      authStatus = 200;
      assert.equal(reserveCalls, 0); assert.equal(upstreamCalls, 0);
    });
    await t.step("invalid input never reserves", async () => {
      assert.equal((await handler(request(true, { ...input, dias: 8 }))).status, 400);
      assert.equal(reserveCalls, 0);
      for (const data_inicio of ['2026-02-30','2026-11-16T00:00:00Z','16/11/2026',null,42]) {
        assert.equal((await handler(request(true,{...input,data_inicio}))).status,400);
      }
      assert.equal(reserveCalls,0);
    });
    await t.step("zero credit and concurrent requests never invoke AI", async () => {
      for (const [state, status] of [["no_credits",402],["busy",409],["reserved",409],["rate_limited",429]] as const) {
        reservation = state; assert.equal((await handler(request())).status, status);
      }
      assert.equal(upstreamCalls, 0);
    });
    await t.step("success finalizes exactly once with validated data", async () => {
      reservation = "acquired";
      const result = await handler(request());
      assert.equal(result.status,200);
      assert.equal((await result.json()).days[0].locations[0].name,"Praia");
      assert.equal(upstreamCalls,1); assert.equal(finalizations.length,1); assert.ok(finalizations[0]);
    });
    await t.step("replay returns stored result without upstream or charge", async () => {
      reservation = "completed";
      assert.equal((await handler(request())).status,200);
      assert.equal(upstreamCalls,1); assert.equal(finalizations.length,1);
    });
    await t.step("upstream errors are sanitized and refunded", async () => {
      reservation = "acquired"; upstreamStatus = 500; upstream = { secret: "private n8n detail" }; finalizations=[];
      const response = await handler(request());
      assert.equal(response.status,502); assert.ok(!(await response.text()).includes("private"));
      assert.deepEqual(finalizations,[null]); upstreamStatus=200;
    });
    await t.step("partially empty itinerary preserves all requested days", async () => {
      upstream = { ...valid, dias: [...valid.dias, { dia: 2, locais: [] }] };
      finalizations = [];
      const response = await handler(request(true, { ...input, dias: 2 }));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.days.length, 2);
      assert.deepEqual(result.days[1].locations, []);
      assert.equal(finalizations.length, 1);
      assert.ok(finalizations[0]);
    });
    await t.step("optional date reaches n8n and committed result and participates in request hash", async () => {
      upstream={...valid,dias:[...valid.dias,{dia:2,locais:[]},{dia:3,locais:[]}]};
      const run=async (data_inicio?: string)=>{
        const response=await handler(request(true,{...input,dias:3,...(data_inicio?{data_inicio}:{})}));
        assert.equal(response.status,200);return response.json();
      };
      const plain=await run();assert.ok(plain.days.every((d:{date?:string})=>d.date===undefined));
      const oldHash=hashes.at(-1);
      const dated=await run('2026-11-16');
      assert.equal(lastInput.data_inicio,'2026-11-16');
      assert.deepEqual(dated.days.map((d:{date:string})=>d.date),['2026-11-16','2026-11-17','2026-11-18']);
      assert.notEqual(hashes.at(-1),oldHash);
      assert.deepEqual(finalizations.at(-1),dated);
      const mondayHash=hashes.at(-1);
      await run('2026-11-20');assert.notEqual(hashes.at(-1),mondayHash);
    });
    await t.step("entirely empty itinerary and insufficient data refunded", async () => {
      for (const payload of [{ dias: [{ dia:1, locais:[] }] }, { dias:[{ dia:1, locais:[{ordem:1,periodo:"manha",duracao_estimada:"1h"}]}] }, {}]) {
        upstream=payload; finalizations=[];
        assert.equal((await handler(request())).status,502); assert.deepEqual(finalizations,[null]);
      }
    });
    await t.step("timeout refunds without retrying AI", async () => {
      timeout=true; finalizations=[]; const before=upstreamCalls;
      assert.equal((await handler(request())).status,504);
      assert.deepEqual(finalizations,[null]); assert.equal(upstreamCalls,before+1); timeout=false;
    });
    await t.step("normalization cannot charge for a response too large for the client", async () => {
      upstream = { dias: Array.from({length:7},(_,day)=>({dia:day+1,locais:Array.from({length:20},(_,i)=>({
        ...valid.dias[0].locais[0],ordem:day*20+i+1,descricao_curta:'x'.repeat(1200),
      }))})) };
      finalizations=[];
      assert.equal((await handler(request(true,{...input,dias:7}))).status,502);
      assert.deepEqual(finalizations,[null]);
    });
    await t.step("uncertain commit never triggers blind refund", async () => {
      upstream=valid; finishFails=true; finalizations=[];
      const response=await handler(request());
      assert.equal(response.status,503); assert.equal((await response.json()).code,"unavailable");
      assert.equal(finalizations.length,1); assert.ok(finalizations[0]);
    });
  } finally {
    globalThis.fetch=originalFetch;
    for (const [key,value] of Object.entries(previous)) { if (value === undefined) Deno.env.delete(key); else Deno.env.set(key,value); }
  }
});
