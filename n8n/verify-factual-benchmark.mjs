import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {hydrateItinerary} from './pipeline.mjs';
import {normalizeItineraryResponse} from '../supabase/functions/_shared/itinerary-schema.ts';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const current=read('./factual-benchmark-evidence.json');
const previous=read('./model-benchmark-evidence.json');
const previousResults=read('./model-benchmark-results.json');
const validate=new Function('$input','$',readFileSync(new URL('./validate-itinerary.code.txt',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const distance=(a,b)=>{
  const rad=n=>n*Math.PI/180;
  const h=Math.sin(rad(b.latitude-a.latitude)/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-a.longitude)/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
};
// Adapter only for replaying the saved old selections; never part of the live workflow.
const oldMinutes=value=>{
  const match=/^(?:(\d+)h)?(?:(\d+)(?:min)?)?$/.exec(value);
  assert.ok(match&&(match[1]||match[2]),'Unrecognized historical duration');
  return Number(match[1]??0)*60+Number(match[2]??0);
};

let checkedPlaces=0;
const results=current.runs.map(run=>{
  const baseline=previous.runs.find(r=>r.caseIndex===run.caseIndex&&r.model==='google/gemini-3.1-flash-lite');
  const baselineOutput=previousResults.results.find(r=>r.executionId===baseline.executionId).output;
  assert.equal(run.responseSuccess,true,'Must reach the success responder, not merely n8n success');
  assert.equal(run.modelCalls,1);
  assert.equal(hash(run.context),hash(baseline.context),'Candidates/request changed between rounds');
  assert.deepEqual(run.catalog,baseline.catalog);
  const prepared={catalog:run.catalog,preferences:run.preferences,bases:run.bases};
  assert.deepEqual(hydrateItinerary(run.modelResult.text??run.modelResult,prepared),run.output);
  validate({first:()=>({json:{output:JSON.stringify(run.output)}})},()=>({first:()=>({json:{body:run.preferences}})}));
  const frontend=normalizeItineraryResponse(run.output,run.preferences.dias);
  const locations=run.output.dias.flatMap(d=>d.locais);
  assert.equal(frontend.locations.length,locations.length);
  assert.equal(run.factualAudit.length,locations.length);
  locations.forEach((local,i)=>{
    const audit=run.factualAudit[i];
    const source=run.catalog.find(c=>c.id===audit.id);
    assert.ok(source);
    assert.equal(audit.realId,source.realId);
    assert.equal(audit.order,i+1);
    assert.equal(local.nome,source.name);
    assert.equal(local.latitude,source.lat);
    assert.equal(local.longitude,source.lon);
    assert.equal(local.descricao_curta,audit.description.text);
    assert.deepEqual(audit.facts,JSON.parse(JSON.stringify({name:source.name,latitude:source.lat,longitude:source.lon,regions:source.regions,types:source.types,
      address:source.address,rating:source.rating,reviews:source.reviews,attrs:source.attrs,hours:source.hours,
      price:source.price,priceRange:source.priceRange,status:source.status})));
    for(const claim of audit.description.evidence) {
      if(claim.field==='types') assert.ok(source.types.includes(claim.value));
      else if(claim.field.startsWith('attrs.')) assert.equal(source.attrs[claim.field.slice(6)],claim.value);
      else assert.equal(source[claim.field],claim.value);
    }
    // No free-text description or model identity is required by the live output.
    assert.match(local.duracao_estimada,/^(?:\d+h(?:\d{2})?|\d+min)$/);
    checkedPlaces++;
  });
  const oldRaw=baseline.modelResult.text??baseline.modelResult;
  const oldPlan=typeof oldRaw==='string'?JSON.parse(oldRaw):oldRaw;
  const oldSelectionNewCopy=hydrateItinerary({dias:oldPlan.dias.map(d=>({dia:d.dia,locais:d.locais.map(l=>({id:l.id,periodo:l.periodo,duracao_minutos:oldMinutes(l.duracao_estimada)}))}))},prepared);
  const days=run.output.dias.map((day,i)=>({day:day.dia,visits:day.locais.length,
    estimatedVisitMinutes:(run.modelResult.text?JSON.parse(run.modelResult.text):run.modelResult).dias[i].locais.reduce((n,l)=>n+l.duracao_minutos,0),
    straightLineKm:Math.round(day.locais.reduce((n,p,j)=>n+(j?distance(day.locais[j-1],p):0),0)*10)/10}));
  return {caseIndex:run.caseIndex,executionId:run.executionId,baselineExecutionId:baseline.executionId,
    totalMs:{before:baseline.totalMs,after:run.totalMs},modelMs:{before:baseline.modelMs,after:run.modelMs},
    tokens:{before:baseline.tokens,after:run.tokens},candidates:run.catalog.length,contextIdentical:true,sourceFactsVerified:true,
    frontendContractValid:true,places:locations.length,days,output:run.output,
    assemblyComparisonSameSelection:{before:baselineOutput,after:oldSelectionNewCopy}};
});
const report={model:current.configuration.model,attempts:current.runs.length,checkedPlaces,
  factualScope:'Grounded in provided records; does not certify real-world accuracy, availability or planning quality.',
  results};
writeFileSync(new URL('./factual-benchmark-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:results.map(({output,assemblyComparisonSameSelection,...r})=>r)},null,2));
