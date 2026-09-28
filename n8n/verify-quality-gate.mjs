import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrateItineraryResult} from './pipeline.mjs';
import {normalizeItineraryResponse} from '../supabase/functions/_shared/itinerary-schema.ts';
const runs=JSON.parse(readFileSync(new URL('./quality-gate-evidence.json',import.meta.url),'utf8'));
const validate=new Function('$input','$',readFileSync(new URL('./validate-itinerary.code.txt',import.meta.url),'utf8'));
let places=0;
for(const run of runs) {
  const final=run.final,plan=final.quality.plan;
  assert.equal(final.quality.gate.passed,true);
  assert.equal(run.initial.gate.passed,['A','D','E'].includes(run.label));
  assert.equal(run.models.length,{A:1,B:1,C:1,'B-live':2,D:0,E:0}[run.label]);
  const hydrated=hydrateItineraryResult(plan,run.prepared);
  const output=JSON.parse(final.output);
  assert.deepEqual(hydrated.itinerary,output);
  assert.deepEqual(JSON.parse(JSON.stringify(hydrated.factualAudit)),final.factualAudit);
  assert.deepEqual(plan.dias.flatMap(d=>d.locais.map(l=>l.id)),final.factualAudit.map(p=>p.id));
  validate({first:()=>({json:{output:final.output}})},()=>({first:()=>({json:{body:run.prepared.preferences}})}));
  const normalized=normalizeItineraryResponse(output,run.prepared.preferences.dias);
  places+=normalized.locations.length;
  if(run.label==='D') assert.ok(final.quality.gate.uncertain.some(u=>u.code==='WEEKDAY_AVAILABILITY_UNCERTAIN'));
  if(run.label==='E') assert.equal(final.planningDiagnostics[0].totalStraightLineKm,74.4);
}
console.log(JSON.stringify({runs:runs.length,places,grounding:true,contract:true,orderPreserved:true}));
