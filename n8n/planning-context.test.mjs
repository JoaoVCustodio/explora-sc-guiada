import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {haversineKm,geographicContext,openingPeriods,parseOpeningSchedule,planningHints,diagnosePlanning} from './planning-context.mjs';
import {prepareCandidates,planRequest,normalizeCandidates,hydrateItineraryResult} from './pipeline.mjs';

const weekdays=['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'];
const week=schedule=>weekdays.map(d=>`${d}: ${schedule}`);

test('Haversine has known scale, symmetry and handles coincident points/date line',()=>{
  assert.equal(haversineKm({lat:0,lon:0},{lat:0,lon:0}),0);
  const degree=haversineKm({lat:0,lon:0},{lat:0,lon:1});
  assert.ok(Math.abs(degree-111.195)<0.001);
  assert.equal(degree,haversineKm({lat:0,lon:1},{lat:0,lon:0}));
  assert.ok(haversineKm({lat:0,lon:179.9},{lat:0,lon:-179.9})<23);
});

test('geography supplies the same reference frame to every candidate without assignments or mutations',()=>{
  const catalog=[{id:'p1',name:'A',lat:-27,lon:-48},{id:'p2',name:'B',lat:-26,lon:-49},{id:'p3',name:'C',lat:-28,lon:-48.5}];
  const saved=structuredClone(catalog),result=geographicContext(catalog);
  assert.deepEqual(catalog,saved);
  assert.deepEqual(geographicContext([...catalog].reverse()),result);
  assert.ok(result.references.length<=4);
  for(const p of catalog) assert.deepEqual(result.distances.get(p.id),result.references.map(ref=>Math.round(haversineKm(p,{lat:ref.c[0],lon:ref.c[1]})*10)/10));
  assert.equal(result.distances.size,catalog.length);
});

test('Norden-like schedule distinguishes narrow occasional mornings from habitual evenings',()=>{
  const hours=weekdays.map((d,i)=>`${d}: ${i<5?'17:00 – 00:00':'11:00 – 00:00'}`);
  assert.deepEqual(openingPeriods(hours),{conhecidos:7,dias:[2,7,7],janela_tipica:[0,60,360],janela_max:[60,360,360]});
});

test('split opening hours retain breaks instead of summing incompatible windows',()=>{
  const hours=week('09:00–11:30, 13:00–16:30');
  assert.deepEqual(openingPeriods(hours),{conhecidos:7,dias:[7,7,0],janela_tipica:[150,210,0],janela_max:[150,210,0]});
  assert.equal(openingPeriods(week('08:00-09:00, 10:00-11:00')).janela_max[0],60);
  assert.equal(openingPeriods(week('08:00-10:00, 10:00-11:00')).janela_max[0],180);
});

test('24h, closure and missing/ambiguous information are distinct',()=>{
  assert.deepEqual(openingPeriods(week('Atendimento 24 horas')).dias,[7,7,7]);
  assert.deepEqual(openingPeriods(week('Fechado')).dias,[0,0,0]);
  assert.deepEqual(openingPeriods([]),{conhecidos:0,dias:null,janela_tipica:null,janela_max:null});
  const partial=openingPeriods(['segunda-feira: 09:00-12:00','terça-feira: sob consulta']);
  assert.equal(partial.conhecidos,1);
  assert.deepEqual(partial.dias,[1,0,0]);
  assert.equal(openingPeriods(week('00:00-00:00')).conhecidos,0);
  assert.equal(openingPeriods(week('09:00-12:00 (feriados sob consulta)')).conhecidos,0);
  assert.equal(parseOpeningSchedule('25:00-26:00'),null);
  assert.equal(parseOpeningSchedule('23:60-02:00'),null);
});

test('overnight intervals and Sunday rollover preserve evidence in the following day',()=>{
  const hours=week('Fechado');
  hours[6]='domingo: 22:00-08:00';
  const parsed=openingPeriods(hours);
  assert.deepEqual(parsed.dias,[1,0,1]);
  assert.deepEqual(parsed.janela_max,[120,0,120]);
  assert.equal(openingPeriods(week('18:00-02:00')).dias[2],7);
});

test('conflicting schedules stay unknown even if a third duplicate agrees with one side',()=>{
  const hours=[...week('09:00-18:00'),'segunda-feira: Fechado','segunda-feira: 09:00-18:00'];
  assert.equal(openingPeriods(hours).conhecidos,6);
  assert.equal(openingPeriods(week('09:00-18:00'),true).conhecidos,0);
  const headers=['id','displayName','location','types','regularOpeningHours'];
  const cells=h=>['same','{"text":"Local"}','{"latitude":-27,"longitude":-48}','["restaurant"]',JSON.stringify({weekdayDescriptions:week(h)})];
  const plan=planRequest({dias:2,regioes:['Grande Florianópolis'],interesses:['gastronomia'],texto:''},'test');
  const response={valueRanges:[{values:[headers,cells('09:00-18:00'),cells('18:00-23:00'),cells('09:00-18:00')]}]};
  const normalized=normalizeCandidates(response,plan);
  assert.equal(normalized.places[0].hoursConflict,true);
  assert.equal(JSON.parse(prepareCandidates(response,plan).context).fatos_atracoes[0].hp.conhecidos,0);
});

test('advisory hints preserve free text, selection order and every factual description',()=>{
  const saved=JSON.parse(readFileSync(new URL('./factual-benchmark-evidence.json',import.meta.url),'utf8'));
  for(const run of saved.runs) {
    const snapshot=JSON.stringify(run.catalog),hints=planningHints(run.catalog);
    assert.equal(JSON.stringify(run.catalog),snapshot);
    assert.equal(hints.byId.size,run.catalog.length);
    const hydrated=hydrateItineraryResult(run.modelResult,run);
    assert.deepEqual(hydrated.itinerary,run.output);
    const diagnostics=diagnosePlanning(hydrated.itinerary,hydrated.factualAudit,run.catalog);
    assert.equal(diagnostics.length,run.preferences.dias);
    assert.deepEqual(hydrated.itinerary,run.output);
  }
});

test('long-distance explicit requests are not rejected, replaced or reordered by diagnostics',()=>{
  const preferences={dias:1,regioes:['Grande Florianópolis'],interesses:['praias'],texto:'Quero A e B no mesmo dia. Aceito dirigir bastante.'};
  const catalog=[{id:'p1',realId:'A',name:'A',lat:-27,lon:-48,types:['beach'],regions:preferences.regioes,attrs:{},hours:[]},
    {id:'p2',realId:'B',name:'B',lat:-28,lon:-49,types:['beach'],regions:preferences.regioes,attrs:{},hours:[]}];
  const prepared={catalog,preferences,bases:[['Grande Florianópolis','base_Florianopolis']]};
  const plan={dias:[{dia:1,locais:[{id:'p2',periodo:'manha',duracao_minutos:120},{id:'p1',periodo:'tarde',duracao_minutos:120}]}]};
  const hydrated=hydrateItineraryResult(plan,prepared),snapshot=structuredClone(hydrated);
  const diagnostics=diagnosePlanning(hydrated.itinerary,hydrated.factualAudit,catalog);
  assert.deepEqual(hydrated,snapshot);
  assert.equal(hydrated.itinerary.dias[0].locais[0].nome,'B');
  assert.ok(diagnostics[0].legs[0].straightLineKm>100);
  assert.equal(diagnostics[0].hours[0].assessment,'unknown');
  assert.equal(prepared.preferences.texto,preferences.texto);
});
