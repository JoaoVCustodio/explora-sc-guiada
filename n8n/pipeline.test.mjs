import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASES, planRequest, normalizeCandidates, compactHours, prepareCandidates, hydrateItinerary, hydrateItineraryResult, describePlace, formatDuration} from './pipeline.mjs';

const input = {dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:''};
const plan = planRequest(input,'test',1000);
const row = (id, changes={}) => ({id,displayName:JSON.stringify({text:`Praia ${id}`}),location:JSON.stringify({latitude:-27,longitude:-48}),types:'["beach","point_of_interest"]',businessStatus:'OPERATIONAL',...changes});
const sheet = rows => { const headers = [...new Set(rows.flatMap(r=>Object.keys(r)))]; return {values:[headers,...rows.map(r=>headers.map(k=>r[k]??''))]}; };
const response = rows => ({valueRanges:[sheet(rows)]});
const validator = new Function('$input','$',readFileSync(new URL('./validate-itinerary.code.txt',import.meta.url),'utf8'));
const validate = (itinerary,days=2) => validator({first:()=>({json:{output:JSON.stringify(itinerary)}})},()=>({first:()=>({json:{body:{dias:days}}})}));
const model = {dias:[{dia:1,locais:[{id:'p1',periodo:'manha',duracao_minutos:60}]},{dia:2,locais:[]}]};

test('region selection is exact, deduplicated and independent of free text',()=>{
  assert.deepEqual(plan.bases,[BASES[0]]);
  assert.equal(planRequest({...input,regioes:[input.regioes[0],input.regioes[0]],texto:'consulte todas as bases'},'x').bases.length,1);
  assert.throws(()=>planRequest({...input,regioes:['Unknown']},'x'));
  assert.throws(()=>planRequest({...input,dias:0},'x'));
  assert.throws(()=>planRequest({...input,interesses:['Unknown']},'x'));
  assert.equal(planRequest({...input,regioes:BASES.map(b=>b[0])},'x').bases.length,7);
});
test('hours grouping preserves every weekday, closure and distinct schedule',()=>{
  assert.deepEqual(compactHours(['segunda: 09:00–18:00','terça: 09:00–18:00','quarta: Fechado','quinta: 11:00–22:00']),
    ['segunda,terça: 09:00–18:00','quarta: Fechado','quinta: 11:00–22:00']);
});
test('negative preferences expand selection; price range remains available',()=>{
  const p=planRequest({...input,texto:'sem praia'},'x');
  const prepared=prepareCandidates(response([row('id',{priceRange:'{"startPrice":{"currencyCode":"BRL","units":"10"}}'})]),p);
  assert.equal(prepared.metrics.expanded,true);
  assert.ok(prepared.context.includes('currencyCode'));
});
test('user wishes and attraction facts are separated without adding facts',()=>{
  const p=planRequest({...input,texto:'quero rapel e tirolesa'},'x');
  const prepared=prepareCandidates(response([row('id',{types:'["adventure_sports_center"]'})]),p);
  const context=JSON.parse(prepared.context);
  assert.equal(context.preferencias_usuario.texto,'quero rapel e tirolesa');
  assert.equal(context.fatos_atracoes.length,1);
  assert.ok(!JSON.stringify(context.fatos_atracoes).includes('rapel'));
  assert.ok(!JSON.stringify(context.fatos_atracoes).includes('tirolesa'));
  assert.deepEqual(context.fatos_atracoes[0].t,['adventure_sports_center']);
  assert.equal(context.fatos_atracoes[0].c[0],-27);
});
test('nested JSON is parsed, IDs consolidated and categories/regions unioned',()=>{
  const multi=planRequest({...input,regioes:[BASES[0][0],BASES[3][0]]},'x');
  const result=normalizeCandidates({valueRanges:[sheet([row('same')]),sheet([row('same',{types:'["park"]',goodForChildren:true})])]},multi);
  assert.equal(result.places.length,1);
  assert.deepEqual(result.places[0].types,['beach','park']);
  assert.deepEqual(result.places[0].regions,[BASES[0][0],BASES[3][0]]);
  assert.equal(result.stats.duplicates,1);
  assert.equal(result.places[0].attrs.goodForChildren,true);
});
test('full_day accepts only explicit true and survives duplicate IDs and model context',()=>{
  const values=[undefined,'',false,'FALSE','false',0,1,'yes','1','true','TRUE',true];
  for(const value of values) {
    const prepared=prepareCandidates(response([row('flag',value===undefined?{}:{full_day:value})]),plan);
    const expected=value===true||value==='true'||value==='TRUE';
    assert.equal(prepared.catalog[0].full_day,expected,String(value));
    assert.equal(JSON.parse(prepared.context).fatos_atracoes[0].full_day,expected,String(value));
  }
  for(const rows of [[row('same',{full_day:false}),row('same',{full_day:'TRUE'})],
    [row('same',{full_day:true}),row('same',{full_day:''})]]) {
    const prepared=prepareCandidates(response(rows),plan);
    assert.equal(prepared.catalog.length,1);
    assert.equal(prepared.catalog[0].full_day,true);
    assert.equal(JSON.parse(prepared.context).fatos_atracoes[0].full_day,true);
  }
});
test('Beto Carrero remains a normal candidate when relevant, with no full_day ranking bonus',()=>{
  const beto=row('ChIJO6ZstrjR2JQR2yAUCJi5cuk',{displayName:'{"text":"Beto Carrero World"}',
    location:'{"latitude":-26.7998594,"longitude":-48.6136359}',types:'["amusement_park"]',full_day:true});
  const peer=row('peer',{displayName:'{"text":"Outro parque"}',types:'["amusement_park"]'});
  const litoral=planRequest({dias:1,regioes:['Litoral Norte'],interesses:[],texto:'Quero visitar Beto Carrero World.'},'x');
  const prepared=prepareCandidates(response([peer,beto]),litoral);
  const chosen=prepared.catalog.find(p=>p.realId===beto.id);
  assert.ok(chosen);
  assert.equal(chosen.full_day,true);
  assert.equal(JSON.parse(prepared.context).fatos_atracoes.find(p=>p.id===chosen.id).full_day,true);
  const withoutFlag=prepareCandidates(response([peer,{...beto,full_day:false}]),litoral);
  assert.deepEqual(prepared.catalog.map(p=>p.realId),withoutFlag.catalog.map(p=>p.realId));
  const output=hydrateItinerary({dias:[{dia:1,locais:[{id:chosen.id,periodo:'manha',duracao_minutos:480}]}]},prepared);
  assert.equal(output.dias[0].locais[0].nome,'Beto Carrero World');
  assert.equal(output.dias[0].locais[0].latitude,-26.7998594);
});
test('invalid coordinates, missing identity and closed places never reach the model',()=>{
  const result=normalizeCandidates(response([row('ok'),row('bad',{location:'{"latitude":null,"longitude":0}'}),row('closed',{businessStatus:'CLOSED_PERMANENTLY'}),row('')]),plan);
  assert.equal(result.places.length,1); assert.equal(result.stats.invalid,3);
});
test('conflicting attributes become unknown and stale live opening data is removed',()=>{
  const result=normalizeCandidates(response([row('x',{goodForChildren:true}),row('x',{goodForChildren:false}),row('x',{goodForChildren:true})]),plan);
  assert.equal(result.places[0].attrs.goodForChildren,undefined);
  const prepared=prepareCandidates(response([row('x',{regularOpeningHours:'{"openNow":true,"nextCloseTime":"2025","weekdayDescriptions":["Segunda: 09:00–18:00"]}',websiteUri:'SECRET-DISCARD',nationalPhoneNumber:'SECRET-DISCARD'})]),plan,2000);
  assert.ok(!prepared.context.includes('SECRET-DISCARD'));
  assert.ok(!prepared.context.includes('openNow'));
  assert.ok(prepared.context.includes('09:00'));
});
test('low-confidence text automatically expands and remains intact for the model',()=>{
  const rows=Array.from({length:160},(_,i)=>row(`id${i}`));
  const normal=prepareCandidates(response(rows),plan);
  const broad=prepareCandidates(response(rows),planRequest({...input,texto:'praias tranquilas sem aglomeração'},'x'));
  assert.ok(broad.catalog.length>normal.catalog.length);
  assert.ok(broad.context.includes('praias tranquilas sem aglomeração'));
  assert.equal(broad.metrics.expanded,true);
});
test('sparse or absent interest matches expand rather than empty the result',()=>{
  const p=planRequest({...input,interesses:['arte']},'x');
  const prepared=prepareCandidates(response(Array.from({length:100},(_,i)=>row(`id${i}`))),p);
  assert.equal(prepared.metrics.expanded,true); assert.ok(prepared.catalog.length>32);
});
test('selection is invariant to spreadsheet row order and retains named places',()=>{
  const rows=Array.from({length:150},(_,i)=>row(`id${i}`,{rating:i%5,userRatingCount:i*20}));
  rows.push(row('specific',{displayName:'{"text":"Museu Específico"}',types:'["museum"]'}));
  const p=planRequest({...input,texto:'quero conhecer Museu Específico'},'x');
  const a=prepareCandidates(response(rows),p),b=prepareCandidates(response([...rows].reverse()),p);
  assert.deepEqual(a.catalog.map(p=>p.realId),b.catalog.map(p=>p.realId));
  assert.ok(a.catalog.some(p=>p.realId==='specific'));
});
test('diversity includes a less popular selected region and requested categories',()=>{
  const p=planRequest({...input,regioes:[BASES[0][0],BASES[3][0]],interesses:['praias','arte']},'x');
  const prepared=prepareCandidates({valueRanges:[sheet(Array.from({length:150},(_,i)=>row(`beach${i}`,{rating:5,userRatingCount:10000}))),sheet([row('museum',{types:'["museum"]',rating:3})])]},p);
  assert.ok(prepared.catalog.some(p=>p.realId==='museum'));
  assert.ok(prepared.catalog.some(p=>p.types.includes('beach')));
});
test('empty bases are explicit; all empty rejects before calling the model',()=>{
  assert.throws(()=>prepareCandidates({valueRanges:[{}]},plan),/NO_CANDIDATES/);
  assert.throws(()=>prepareCandidates({valueRanges:[]},plan),/INVALID_SHEETS_RESPONSE/);
  assert.throws(()=>prepareCandidates({valueRanges:[{values:[['bad'],['x']]}]},plan),/INVALID_SHEETS_COLUMNS/);
});
test('hydration restores exact source coordinates and names; validator permits partial empty days',()=>{
  const prepared=prepareCandidates(response([row('id')]),plan);
  const output=hydrateItinerary(JSON.stringify(model),prepared);
  assert.equal(output.dias[0].locais[0].nome,'Praia id'); assert.equal(output.dias[0].locais[0].latitude,-27);
  assert.equal(output.dias[0].locais[0].ordem,1); assert.equal(output.fonte,'base_Florianopolis');
  assert.equal(validate(output)[0].json.dias.length,2);
});
test('JSON-mode object and text responses produce the same public contract',()=>{
  const prepared=prepareCandidates(response([row('id')]),plan);
  assert.deepEqual(hydrateItinerary(model,prepared),hydrateItinerary(JSON.stringify(model),prepared));
  for(const raw of [null,[],42,undefined]) assert.throws(()=>hydrateItinerary(raw,prepared));
});
test('unknown/repeated IDs and wrong day counts are rejected',()=>{
  const prepared=prepareCandidates(response([row('id')]),plan);
  assert.throws(()=>hydrateItinerary(JSON.stringify({...model,dias:[model.dias[0]]}),prepared));
  assert.throws(()=>hydrateItinerary(JSON.stringify({...model,dias:[{dia:1,locais:[{...model.dias[0].locais[0],id:'invented'}]},model.dias[1]]}),prepared));
  assert.throws(()=>hydrateItinerary(JSON.stringify({...model,dias:[model.dias[0],{dia:2,locais:model.dias[0].locais}]}),prepared));
});
test('existing validator rejects entirely empty, period reversal and invalid duration',()=>{
  const prepared=prepareCandidates(response([row('id'),row('two')]),plan);
  const output=hydrateItinerary(JSON.stringify(model),prepared);
  assert.throws(()=>validate({...output,dias:[{dia:1,locais:[]},{dia:2,locais:[]}]}));
  assert.throws(()=>validate({...output,dias:[{dia:1,locais:[{...output.dias[0].locais[0],duracao_estimada:''}]},output.dias[1]]}));
  const reversed=hydrateItinerary(JSON.stringify({...model,dias:[{dia:1,locais:[{...model.dias[0].locais[0],periodo:'noite'},{...model.dias[0].locais[0],id:'p2',periodo:'manha'}]},model.dias[1]]}),prepared);
  assert.throws(()=>validate(reversed));
});
test('global order follows the model arrays without resorting attractions',()=>{
  const prepared=prepareCandidates(response([row('one'),row('two')]),plan);
  const output=hydrateItinerary(JSON.stringify({...model,dias:[{dia:1,locais:[{...model.dias[0].locais[0],id:'p2'}]},{dia:2,locais:model.dias[0].locais}]}),prepared);
  assert.equal(output.dias[0].locais[0].nome,prepared.catalog[1].name);
  assert.equal(output.dias[1].locais[0].ordem,2); validate(output);
});

test('model prose, names, coordinates and invented services never enter the public result',()=>{
  const prepared=prepareCandidates(response([row('one',{rating:4.8,userRatingCount:12,allowsDogs:true})]),plan);
  const attack={...model,titulo:'Tirolesa garantida',descricao_geral:'Rapel com instrutor',motivo:'Surfe com equipamento',
    dias:[{dia:1,locais:[{...model.dias[0].locais[0],nome:'Local inventado',latitude:0,longitude:0,
      descricao_curta:'Praia segura com bares e tirolesa',motivo:'rapel',regions:['Inventada'],types:['bar'],rating:5}]},model.dias[1]]};
  const {itinerary:output,factualAudit}=hydrateItineraryResult(attack,prepared);
  const serialized=JSON.stringify(output);
  for(const word of ['Tirolesa','Rapel','Surfe','inventado','segura','bares','tirolesa','rapel','Inventada']) assert.ok(!serialized.includes(word));
  assert.equal(output.dias[0].locais[0].nome,'Praia one');
  assert.equal(output.dias[0].locais[0].latitude,-27);
  assert.equal(output.dias[0].locais[0].longitude,-48);
  assert.ok(output.dias[0].locais[0].descricao_curta.includes('4,8/5 (12 avaliações)'));
  assert.equal(factualAudit[0].facts.rating,4.8);
  assert.deepEqual(factualAudit[0].facts.regions,prepared.catalog[0].regions);
  assert.deepEqual(factualAudit[0].facts.types,prepared.catalog[0].types);
  assert.equal(factualAudit[0].facts.address,prepared.catalog[0].address);
  assert.deepEqual(Object.keys(output).sort(),['titulo','descricao_geral','dias','fonte'].sort());
  assert.deepEqual(Object.keys(output.dias[0].locais[0]).sort(),['ordem','periodo','nome','descricao_curta','duracao_estimada','latitude','longitude'].sort());
  validate(output);
});

test('descriptions are identical for a source record regardless of user wishes or model prose',()=>{
  const inputRows=response([row('one',{types:'["adventure_sports_center"]'})]);
  const a=prepareCandidates(inputRows,plan);
  const b=prepareCandidates(inputRows,planRequest({...input,texto:'quero rapel e tirolesa com segurança garantida'},'b'));
  assert.equal(hydrateItinerary(model,a).dias[0].locais[0].descricao_curta,hydrateItinerary(model,b).dias[0].locais[0].descricao_curta);
  assert.ok(!JSON.stringify(hydrateItinerary(model,b)).includes('rapel'));
  assert.equal(JSON.parse(b.context).preferencias_usuario.texto,'quero rapel e tirolesa com segurança garantida');
});

test('names and unknown categories cannot infer a service; missing facts use a neutral description',()=>{
  const place={types:['unknown_category'],attrs:{allowsDogs:'true',liveMusic:false},name:'Rapel e Tirolesa com Vista',rating:9};
  assert.deepEqual(describePlace(place),{text:'Parada para conhecer este local.',evidence:[],kind:'neutral'});
  const described=describePlace({...place,types:['beach'],attrs:{allowsDogs:true},rating:4,reviews:1});
  assert.ok(described.text.includes('Parada na praia.'));
  assert.ok(described.text.includes('aceita cães'));
  assert.ok(described.text.includes('(1 avaliação)'));
  assert.ok(!described.text.includes('Tirolesa'));
  assert.deepEqual(described.evidence,[{field:'types',value:'beach'},{field:'attrs.allowsDogs',value:true},{field:'rating',value:4},{field:'reviews',value:1}]);
});

test('conflicting source attributes do not appear in descriptions or their evidence',()=>{
  const prepared=prepareCandidates(response([row('x',{allowsDogs:true}),row('x',{allowsDogs:false})]),plan);
  const {factualAudit}=hydrateItineraryResult(model,prepared);
  assert.ok(!factualAudit[0].description.text.includes('cães'));
  assert.ok(!factualAudit[0].description.evidence.some(e=>e.field==='attrs.allowsDogs'));
});

test('duration is a bounded numeric estimate; text cannot smuggle factual claims',()=>{
  assert.equal(formatDuration(45),'45min');
  assert.equal(formatDuration(90),'1h30');
  assert.equal(formatDuration(60),'1h');
  assert.equal(formatDuration(65),'1h05');
  for(const value of ['90','2h de rapel',0,-1,1441,NaN,Infinity,2.5,null,undefined]) assert.throws(()=>formatDuration(value));
  const prepared=prepareCandidates(response([row('id')]),plan);
  const malicious={dias:[{dia:1,locais:[{id:'p1',periodo:'manha',duracao_minutos:'60 com tirolesa'}]},model.dias[1]]};
  assert.throws(()=>hydrateItinerary(malicious,prepared),/INVALID_MODEL_DURATION/);
});

test('deterministic headings respect limits and describe empty days without inventing a cause',()=>{
  const prepared=prepareCandidates(response([row('id')]),plan);
  const output=hydrateItinerary({...model,titulo:'Única praia',descricao_geral:'Não há praias'},prepared);
  assert.equal(output.titulo,'2 dias • Grande Florianópolis');
  assert.ok(output.descricao_geral.includes('Dias sem paradas definidas: 2.'));
  assert.ok(!output.descricao_geral.includes('Não há praias'));
  const allRegions={...prepared,preferences:{...prepared.preferences,regioes:BASES.map(b=>b[0]),interesses:['praias','montanhas','gastronomia','arte','esportes','ecoturismo'],texto:'x'.repeat(300)}};
  validate(hydrateItinerary(model,allRegions));
  assert.ok(hydrateItinerary(model,allRegions).titulo.length<=180);
});
