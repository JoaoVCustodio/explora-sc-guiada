import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCalendarDate,isTripStart,tripCalendar,addCalendarDays,itineraryDayLabel} from '../supabase/functions/_shared/calendar-date.mjs';
import {planRequest,hydrateItineraryResult} from './pipeline.mjs';
import {planningHints,openingPeriods} from './planning-context.mjs';
import {assessQuality,buildCorrectionContext} from './quality-gate.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./quality-gate-fixtures.json',import.meta.url),'utf8'));
test('date-only validates real dates, leap years, overflow and rejects timestamps',()=>{
  for(const d of ['2026-02-29','2026-13-01','2026-11-31','2026-11-16T00:00:00Z','16/11/2026','',null,13]) assert.equal(isCalendarDate(d),false);
  assert.equal(isCalendarDate('2028-02-29'),true);
  assert.equal(isTripStart('9999-12-31',2),false);
  assert.equal(addCalendarDays('2026-12-31',1),'2027-01-01');
  assert.equal(addCalendarDays('2028-02-28',1),'2028-02-29');
});
test('three days from Monday and weekend transition are deterministic across timezones',()=>{
  const original=process.env.TZ;
  try { for(const tz of ['America/Sao_Paulo','Pacific/Kiritimati','America/Los_Angeles']) {
    process.env.TZ=tz;
    assert.deepEqual(tripCalendar('2026-11-16',3).map(d=>[d.data,d.dia_semana]),[['2026-11-16','segunda'],['2026-11-17','terça'],['2026-11-18','quarta']]);
    assert.deepEqual(tripCalendar('2026-11-20',3).map(d=>d.dia_semana),['sexta','sábado','domingo']);
    assert.equal(itineraryDayLabel(1,'2026-11-16'),'Dia 1 · Segunda, 16 nov');
  }} finally {if(original===undefined) delete process.env.TZ;else process.env.TZ=original;}
  assert.equal(itineraryDayLabel(2),'Dia 2');
});
test('no-date requests and outputs stay compatible; supplied dates override model inventions',()=>{
  const f=fixtures.find(f=>f.label==='D');
  assert.equal(planRequest(f.preferences,'test').preferences.data_inicio,undefined);
  const legacy=hydrateItineraryResult(f.modelPlan,f.prepared).itinerary;
  assert.equal(legacy.dias[0].data,undefined);
  const prepared={...f.prepared,preferences:{...f.preferences,data_inicio:'2026-11-16'}};
  const model=structuredClone(f.modelPlan);model.dias[0].data='2099-01-01';
  assert.equal(hydrateItineraryResult(model,prepared).itinerary.dias[0].data,'2026-11-16');
  assert.throws(()=>planRequest({...f.preferences,data_inicio:'2026-02-30'},'test'),/INVALID_REQUEST_DATE/);
});
test('weekly hours: Monday morning fails, Saturday morning passes, no-date remains uncertain',()=>{
  const f=fixtures.find(f=>f.label==='D');
  assert.equal(assessQuality(f.modelPlan,f.prepared).passed,true);
  const dated=date=>({...f.prepared,preferences:{...f.preferences,data_inicio:date}});
  const monday=dated('2026-11-16'),gate=assessQuality(f.modelPlan,monday);
  assert.equal(gate.passed,false);assert.equal(gate.reasons[0].date,'2026-11-16');
  assert.equal(assessQuality(f.modelPlan,dated('2026-11-21')).passed,true);
  const hints=planningHints(monday.catalog,tripCalendar('2026-11-16',1));
  assert.equal(hints.byId.get(f.modelPlan.dias[0].locais[0].id).hd[0][0],0);
  const context={...JSON.parse(monday.context),calendario_viagem:tripCalendar('2026-11-16',1)};
  const correction=JSON.parse(buildCorrectionContext(f.modelPlan,gate,{...monday,context:JSON.stringify(context)}));
  assert.equal(correction.calendario_viagem[0].dia_semana,'segunda');
  const fixed=structuredClone(f.modelPlan);fixed.dias[0].locais[0].periodo='noite';
  assert.equal(assessQuality(fixed,monday).passed,true);
});
test('missing, contradictory and incomplete weekly schedules preserve uncertainty, including overnight carry',()=>{
  assert.equal(openingPeriods([],false,true).semana[0],null);
  assert.equal(openingPeriods(['segunda: fechado','segunda: 09:00 - 18:00'],false,true).semana[0],null);
  assert.equal(openingPeriods(['segunda: fechado'],false,true).semana[0][0],null,'unknown Sunday could carry into Monday');
  assert.equal(openingPeriods(['domingo: 22:00 - 08:00','segunda: fechado'],false,true).semana[0][0],120);
  const f=fixtures.find(f=>f.label==='D');
  for(const hours of [[],['segunda: fechado']]) {
    const prepared={...f.prepared,preferences:{...f.preferences,data_inicio:'2026-11-16'},catalog:f.prepared.catalog.map(p=>({...p,hours}))};
    assert.equal(assessQuality(f.modelPlan,prepared).passed,true);
  }
});
test('generated correction branch keeps request dates and revalidates corrected weekday period',()=>{
  const ops=JSON.parse(readFileSync(new URL('./update-operations.json',import.meta.url),'utf8'));
  const nodes=ops.filter(o=>o.type==='addNode').map(o=>o.node);
  const fixture=fixtures.find(f=>f.label==='D');
  const preferences={...fixture.preferences,data_inicio:'2026-11-16'};
  const context={...JSON.parse(fixture.prepared.context),calendario_viagem:tripCalendar(preferences.data_inicio,1)};
  const prepared={...fixture.prepared,preferences,context:JSON.stringify(context),startedAt:Date.now(),preparedAt:Date.now()};
  const state={'Webhook':{body:preferences},'Preparar candidatos':prepared,'Montar roteiro':fixture.modelPlan};
  const execute=(name,payload)=>new Function('$input','$','console',nodes.find(n=>n.name===name).parameters.jsCode)(
    {first:()=>({json:payload})},n=>({first:()=>({json:state[n]})}),{log:()=>{}})[0].json;
  const hydrated=execute('Recuperar locais reais',fixture.modelPlan);
  state['Quality gate']=execute('Quality gate',hydrated);
  assert.equal(state['Quality gate'].quality.needsCorrection,true);
  assert.equal(JSON.parse(state['Quality gate'].quality.correctionContext).calendario_viagem[0].data,'2026-11-16');
  const corrected=structuredClone(fixture.modelPlan);corrected.dias[0].locais[0].periodo='noite';
  corrected.dias[0].data='2026-11-21';
  const result=execute('Reavaliar correção',corrected);
  assert.equal(result.quality.gate.passed,true);
  assert.equal(result.quality.needsCorrection,false);
  assert.equal(JSON.parse(result.output).dias[0].data,'2026-11-16');
});
