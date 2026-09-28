import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {hydrateItineraryResult} from './pipeline.mjs';
import {diagnosePlanning,planningHints} from './planning-context.mjs';
import {normalizeItineraryResponse} from '../supabase/functions/_shared/itinerary-schema.ts';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const current=read('./planning-benchmark-evidence.json');
const previous=read('./factual-benchmark-evidence.json');
const validate=new Function('$input','$',readFileSync(new URL('./validate-itinerary.code.txt',import.meta.url),'utf8'));
const json=value=>JSON.parse(JSON.stringify(value));
const withoutConflict=place=>{const copy={...place};delete copy.hoursConflict;return copy;};
let checkedPlaces=0;

const results=current.runs.map(run=>{
  assert.equal(run.responseSuccess,true);
  assert.equal(run.modelCalls,1);
  assert.deepEqual(run.preferences,current.cases[run.caseIndex]);
  const baseline=run.caseIndex<3?previous.runs.find(r=>r.caseIndex===run.caseIndex):null;
  if(baseline) assert.deepEqual(run.catalog.map(withoutConflict),baseline.catalog.map(withoutConflict));
  const context=JSON.parse(run.context),hints=planningHints(run.catalog);
  assert.deepEqual(context.preferencias_usuario,run.preferences);
  assert.deepEqual(context.referencias_geograficas,hints.references);
  for(const candidate of context.fatos_atracoes) {
    const calculated=hints.byId.get(candidate.id);
    assert.deepEqual(candidate.geo_km,calculated.geo_km);
    assert.deepEqual(candidate.hp,calculated.hp);
  }
  const hydrated=hydrateItineraryResult(run.modelResult.text??run.modelResult,run);
  assert.deepEqual(hydrated.itinerary,run.output);
  assert.deepEqual(json(hydrated.factualAudit),run.factualAudit);
  const snapshot=JSON.stringify(hydrated);
  const diagnostics=diagnosePlanning(hydrated.itinerary,hydrated.factualAudit,run.catalog);
  assert.equal(JSON.stringify(hydrated),snapshot,'Diagnostics mutated the itinerary');
  assert.deepEqual(diagnostics,run.planningDiagnostics);
  validate({first:()=>({json:{output:JSON.stringify(run.output)}})},()=>({first:()=>({json:{body:run.preferences}})}));
  const frontend=normalizeItineraryResponse(run.output,run.preferences.dias);
  const raw=run.modelResult.text?JSON.parse(run.modelResult.text):run.modelResult;
  const selectedIds=raw.dias.flatMap(d=>d.locais.map(l=>l.id));
  assert.deepEqual(selectedIds,run.factualAudit.map(p=>p.id),'Selection or global order changed after the model');
  const displayed=run.output.dias.flatMap(d=>d.locais);
  assert.equal(frontend.locations.length,displayed.length);
  run.factualAudit.forEach((audit,i)=>{
    const source=run.catalog.find(p=>p.id===audit.id),place=displayed[i];
    assert.equal(place.nome,source.name);
    assert.equal(place.latitude,source.lat);
    assert.equal(place.longitude,source.lon);
    assert.equal(place.descricao_curta,audit.description.text);
    for(const claim of audit.description.evidence) {
      if(claim.field==='types') assert.ok(source.types.includes(claim.value));
      else if(claim.field.startsWith('attrs.')) assert.equal(source.attrs[claim.field.slice(6)],claim.value);
      else assert.equal(source[claim.field],claim.value);
    }
    checkedPlaces++;
  });
  const baselineDiagnostics=baseline?diagnosePlanning(baseline.output,baseline.factualAudit,baseline.catalog):null;
  const flatten=days=>days.flatMap(d=>d.hours);
  const baselineStats=baseline?{executionId:baseline.executionId,totalMs:baseline.totalMs,modelMs:baseline.modelMs,tokens:baseline.tokens,
    visits:baseline.factualAudit.length,dailyStraightLineKm:baselineDiagnostics.map(d=>d.totalStraightLineKm),
    limitedPeriods:flatten(baselineDiagnostics).filter(p=>p.assessment==='limited_days').length}:null;
  if(run.caseIndex===3) {
    const names=['Mirante do Encanto','Praia da Armação'];
    assert.ok(run.output.dias.some(day=>names.every(name=>day.locais.some(p=>p.nome===name))),'Explicit distant visits not kept together');
  }
  const summary={caseIndex:run.caseIndex,executionId:run.executionId,totalMs:run.totalMs,modelMs:run.modelMs,tokens:run.tokens,
    candidates:run.catalog.length,days:run.output.dias.length,visits:displayed.length,emptyDays:run.output.dias.filter(d=>!d.locais.length).map(d=>d.dia),
    dailyStraightLineKm:diagnostics.map(d=>d.totalStraightLineKm),
    noRegisteredOpening:flatten(diagnostics).filter(p=>p.assessment==='no_registered_opening').length,
    limitedPeriods:flatten(diagnostics).filter(p=>p.assessment==='limited_days'),
    unknownPeriods:flatten(diagnostics).filter(p=>p.assessment==='unknown').length,
    hoursConflicts:run.catalog.filter(p=>p.hoursConflict).length,
    baseline:baselineStats,modelOrderPreserved:true,frontendContractValid:true,groundingVerified:true};
  return {...summary,output:run.output,diagnostics};
});
const report={model:current.configuration.model,attempts:results.length,checkedPlaces,
  scope:'Distances are straight-line diagnostics; no routing, reassignment, rejection or retry. Schedule compatibility is conditional on weekday, not guaranteed availability.',results};
writeFileSync(new URL('./planning-benchmark-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:results.map(({output,diagnostics,...r})=>r)},null,2));
