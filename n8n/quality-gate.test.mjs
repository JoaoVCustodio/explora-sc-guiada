import test from 'node:test';
import assert from 'node:assert/strict';
import {assessQuality,qualityEnvelope,buildCorrectionContext,qualityScope} from './quality-gate.mjs';
import {planningHints} from './planning-context.mjs';

const weekdays=['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'];
const hours=s=>weekdays.map(d=>`${d}: ${s}`);
const place=(id,type='beach',schedule=[])=>({id,realId:id,name:`Local ${id}`,lat:-27,lon:-48,types:[type],hours:schedule,attrs:{},regions:['Grande Florianópolis']});
const visit=(id,periodo='manha')=>({id,periodo,duracao_minutos:60});
const plan=(...days)=>({dias:days.map((locais,i)=>({dia:i+1,locais}))});
const prepared=(catalog,preferences={dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:''})=>{
  const hints=planningHints(catalog);
  return {catalog,preferences,startedAt:1000,context:JSON.stringify({preferencias_usuario:preferences,
    fatos_atracoes:catalog.map(p=>({id:p.id,n:p.name,t:p.types,full_day:p.full_day===true,...hints.byId.get(p.id)})),legenda_planejamento:hints.legend,referencias_geograficas:hints.references})};
};
const beachCatalog=[place('b1'),place('b2'),place('b3'),place('b4'),place('r1','restaurant'),place('m1','museum')];

test('A: normal plan passes with no correction and no mutation',()=>{
  const p=plan([visit('b1')],[visit('b2')]),saved=structuredClone(p),data=prepared(beachCatalog);
  const result=qualityEnvelope(p,data,{now:2000});
  assert.equal(result.gate.passed,true);assert.equal(result.needsCorrection,false);assert.equal(result.finalResult,'passed_direct');
  assert.deepEqual(p,saved);
});
test('full_day passes alone, fails with another place, and the existing correction path revalidates',()=>{
  const catalog=[{...place('park','amusement_park'),full_day:true},place('beach')];
  const data=prepared(catalog,{dias:2,regioes:['Grande Florianópolis'],interesses:[],texto:''});
  const alone=plan([visit('park')],[visit('beach')]);
  assert.equal(assessQuality(alone,data).passed,true);
  const shared=plan([visit('park'),visit('beach','tarde')],[]),saved=structuredClone(shared);
  const first=qualityEnvelope(shared,data,{now:2000});
  assert.equal(first.gate.passed,false);
  assert.deepEqual(first.gate.reasons.map(r=>r.code),['FULL_DAY_SHARED']);
  assert.equal(first.gate.reasons[0].day,1);
  assert.deepEqual(first.gate.reasons[0].candidateIds,['park','beach']);
  assert.equal(first.needsCorrection,true);
  assert.deepEqual(JSON.parse(first.correctionContext).fatos_atracoes.map(p=>p.full_day),[true,false]);
  const corrected=qualityEnvelope(alone,data,{attempt:1,initialGate:first.initialGate,now:3000});
  assert.equal(corrected.gate.passed,true);
  assert.equal(corrected.finalResult,'corrected');
  assert.equal(qualityEnvelope(shared,data,{attempt:1,initialGate:first.initialGate,now:3000}).finalResult,'rejected_after_correction');
  assert.deepEqual(shared,saved);
});
test('B: empty day with enough unused relevant options requests a single correction',()=>{
  const result=qualityEnvelope(plan([visit('b1')],[]),prepared(beachCatalog),{now:2000});
  assert.equal(result.needsCorrection,true);
  assert.deepEqual(result.gate.reasons.map(r=>r.code),['EMPTY_DAYS_WITH_OPTIONS']);
  assert.deepEqual(result.gate.reasons[0].days,[2]);
});
test('empty days stay allowed with insufficient options, irrelevant options, rest or exclusive requests',()=>{
  for(const data of [prepared([place('b1'),place('r1','restaurant'),place('r2','restaurant')]),prepared([place('b1')]),
    prepared(beachCatalog,{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Quero um dia livre para descanso.'}),
    prepared(beachCatalog,{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Quero apenas Local b1.'})]) {
    assert.equal(assessQuality(plan([visit('b1')],[]),data).passed,true);
  }
});
test('C: strong beach preference, available alternatives and discretionary non-beach imbalance',()=>{
  const data=prepared(beachCatalog,{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Quero priorizar praias diferentes.'});
  const p=plan([visit('b1'),visit('r1','tarde')],[visit('m1')]);
  const result=assessQuality(p,data);
  assert.equal(result.passed,false);
  assert.equal(result.reasons[0].code,'STRONG_BEACH_PREFERENCE_UNDERSERVED');
  const correction=JSON.parse(buildCorrectionContext(p,result,data));
  assert.deepEqual(correction.preferencias_usuario,data.preferences);
  assert.deepEqual(correction.roteiro_atual,p);
  assert.deepEqual(correction.fatos_atracoes.map(p=>p.id),beachCatalog.map(p=>p.id));
});
test('preference rule is not a universal beach quota or an override of named visits',()=>{
  const p=plan([visit('b1'),visit('r1','tarde')],[visit('m1')]);
  for(const data of [prepared(beachCatalog),prepared(beachCatalog,{dias:2,regioes:['Grande Florianópolis'],interesses:['praias','arte','gastronomia'],texto:''}),
    prepared(beachCatalog.slice(0,1).concat(beachCatalog.slice(4)),{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Quero praias.'}),
    prepared(beachCatalog,{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Quero praias e visitar Local r1 e Local m1.'})]) assert.equal(assessQuality(p,data).passed,true);
});
test('negation, unverified qualifiers and unknown text do not cause preference false positives',()=>{
  for(const texto of ['Não quero praias.','Quero praias tranquilas com bares por perto.','Quero praias sem aglomeração.','Quero visitar um museu de automóveis.']) {
    const data=prepared(beachCatalog,{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto});
    assert.equal(qualityScope(data.preferences,data.catalog).confident,false);
    assert.equal(assessQuality(plan([visit('b1'),visit('r1','tarde')],[]),data).passed,true);
  }
});
test('D: weekday-varying opening is uncertain, never rejected just for minority availability',()=>{
  const source=place('r1','restaurant',weekdays.map((d,i)=>`${d}: ${i<5?'17:00–00:00':'11:00–00:00'}`));
  const data=prepared([source],{dias:1,regioes:['Grande Florianópolis'],interesses:['gastronomia'],texto:''});
  const result=assessQuality(plan([visit('r1')]),data);
  assert.equal(result.passed,true);
  assert.equal(result.uncertain[0].code,'WEEKDAY_AVAILABILITY_UNCERTAIN');
});
test('a completely known incompatible period is material; incomplete or conflicting schedules are not',()=>{
  const night=place('r1','restaurant',hours('18:00–23:00'));
  const data=prepared([night],{dias:1,regioes:['Grande Florianópolis'],interesses:['gastronomia'],texto:''});
  assert.equal(assessQuality(plan([visit('r1')]),data).reasons[0].code,'PERIOD_UNAVAILABLE');
  assert.equal(assessQuality(plan([visit('r1','noite')]),data).passed,true);
  for(const variant of [{...night,hours:night.hours.slice(0,6)},{...night,hoursConflict:true},{...night,hours:[]}]) {
    assert.equal(assessQuality(plan([visit('r1')]),prepared([variant],data.preferences)).passed,true);
  }
});
test('E: long distances never trigger failure, including explicit travel tolerance',()=>{
  const catalog=[place('b1'),{...place('b2'),lat:-29,lon:-50}];
  const data=prepared(catalog,{dias:1,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Não me importo em dirigir bastante e aceito deslocamentos maiores.'});
  const p=plan([visit('b2'),visit('b1','tarde')]),saved=structuredClone(p);
  assert.equal(assessQuality(p,data).passed,true);assert.deepEqual(p,saved);
});
test('no third attempt; persistent failures are rejected, passed correction is accepted',()=>{
  const data=prepared(beachCatalog),bad=plan([visit('b1')],[]),initial=assessQuality(bad,data);
  const retry=qualityEnvelope(bad,data,{attempt:1,initialGate:initial,now:3000});
  assert.equal(retry.needsCorrection,false);assert.equal(retry.finalResult,'rejected_after_correction');
  assert.equal(retry.correctionContext,undefined);
  assert.equal(qualityEnvelope(plan([visit('b1')],[visit('b2')]),data,{attempt:1,initialGate:initial,now:3000}).finalResult,'corrected');
  assert.throws(()=>qualityEnvelope(bad,data,{attempt:2}),/QUALITY_ATTEMPT_LIMIT/);
});
test('time budget is shared by both calls; lack of budget never returns the known bad result',()=>{
  const result=qualityEnvelope(plan([visit('b1')],[]),prepared(beachCatalog),{now:56000});
  assert.equal(result.gate.passed,false);assert.equal(result.needsCorrection,false);assert.equal(result.finalResult,'rejected_time_budget');
});
test('closed-every-day unused candidates do not justify filling empty days',()=>{
  const data=prepared([place('b1'),place('b2','beach',hours('Fechado')),place('b3','beach',hours('Fechado'))]);
  assert.equal(assessQuality(plan([visit('b1')],[]),data).passed,true);
});
