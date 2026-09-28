import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
// Frozen implementation: historical results must not change with the current draft.
import {hydrateItinerary} from './model-benchmark-pipeline.mjs';

const read = name => JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const input=read('./model-benchmark-evidence.json');
const validate=new Function('$input','$',readFileSync(new URL('./validate-itinerary.code.txt',import.meta.url),'utf8'));
const hashes=new Map();
const hash=value=>createHash('sha256').update(value).digest('hex');
const dist=(a,b)=>{
  const rad=x=>x*Math.PI/180;
  const lat=rad(b.latitude-a.latitude),lon=rad(b.longitude-a.longitude);
  const h=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lon/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
};
const results=input.runs.map(run=>{
  const fingerprint=hash(run.context);
  const previous=hashes.get(run.caseIndex);
  if(previous) assert.equal(fingerprint,previous,'Model contexts changed between runs');
  hashes.set(run.caseIndex,fingerprint);
  let output,structuralError;
  if(run.modelResult) {
    try {
      output=hydrateItinerary(run.modelResult.text??run.modelResult,{catalog:run.catalog,preferences:input.cases[run.caseIndex],bases:run.bases});
      validate({first:()=>({json:{output:JSON.stringify(output)}})},()=>({first:()=>({json:{body:input.cases[run.caseIndex]}})}));
    } catch(error) {structuralError=error.message;}
  }
  const perDay=output?.dias.map(d=>({day:d.dia,places:d.locais.length,
    straightLineKm:Math.round(d.locais.reduce((total,p,i)=>total+(i?dist(d.locais[i-1],p):0),0)*10)/10}));
  return {executionId:run.executionId,model:run.model,caseIndex:run.caseIndex,totalMs:run.totalMs,modelMs:run.modelMs,
    modelCalls:run.modelCalls,tokens:run.tokens??null,estimatedInputTokens:run.estimatedInputTokens,
    contextHash:fingerprint,candidates:run.catalog.length,
    workflowContractValid:run.workflowContractValid,replayedContractValid:!!output&&!structuralError,
    error:run.error??structuralError??null,perDay,output};
});
const models=[...new Set(results.map(r=>r.model))].map(model=>{
  const runs=results.filter(r=>r.model===model);
  const ok=runs.filter(r=>r.replayedContractValid);
  return {model,attempts:runs.length,modelResponses:ok.length,liveContractPasses:runs.filter(r=>r.workflowContractValid).length,
    successfulTotalMeanMs:ok.length?Math.round(ok.reduce((s,r)=>s+r.totalMs,0)/ok.length):null,
    successfulModelMeanMs:ok.length?Math.round(ok.reduce((s,r)=>s+r.modelMs,0)/ok.length):null};
});
const report={protocol:input.protocol,cases:input.cases,identicalContexts:true,models,results};
writeFileSync(new URL('./model-benchmark-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({models,identicalContexts:true,results:results.map(({output,...r})=>r)},null,2));
