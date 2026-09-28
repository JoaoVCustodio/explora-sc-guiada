import {fold} from './pipeline.mjs';
import {openingPeriods,PLANNING_PERIODS} from './planning-context.mjs';
import {tripCalendar} from '../supabase/functions/_shared/calendar-date.mjs';

const gateTypes={
  praias:['beach'],
  montanhas:['hiking_area','mountain_peak','adventure_sports_center'],
  gastronomia:['restaurant','cafe','bar','pub','bakery','confectionery'],
  arte:['museum','art_gallery','performing_arts_theater','historical_landmark'],
  esportes:['sports_activity_location','sports_club','sports_complex','adventure_sports_center'],
  ecoturismo:['hiking_area','park','state_park','national_park','nature_preserve'],
};
const gateWords={praias:['praia','praias'],montanhas:['montanha','montanhas','trilha','trilhas'],
  gastronomia:['gastronomia','restaurante','restaurantes','comida','comer'],arte:['arte','museu','museus'],
  esportes:['esporte','esportes'],ecoturismo:['ecoturismo','natureza','parque','parques']};

export function qualityScope(preferences,catalog) {
  const original=fold(preferences.texto);
  const named=catalog.filter(p=>fold(p.name).length>4&&original.includes(fold(p.name)));
  let text=original;
  for(const p of [...named].sort((a,b)=>b.name.length-a.name.length)) text=text.replaceAll(fold(p.name),' ');
  text=text.replace(/\bnao me importo\b/g,' ').replace(/\bnao tenho problema em dirigir\b/g,' ');
  const restRequested=/\b(descanso|descansar|livre|livres)\b/.test(text);
  const restricted=/\b(nao|sem|evitar|evite|apenas|somente|so|exceto|menos|exclusivamente)\b/.test(text);
  const generic=new Set(('a o as os de da do das dos e em na no nas nos um uma uns umas para por com que eu me meu minha meus minhas quero queria gostaria gosto visitar conhecer fazer ir ter ao aos dias dia roteiro viagem passeios passeio prefiro preferencia preferencias priorizo priorizar prioridade foco focado focada principal principalmente bastante muito mais varias varios diferentes diversas diversos locais lugar lugares atracoes incluir inclua primeiro segundo terceiro mesmo esses essas dois duas tres quatro cinco seis sete dirigir aceito aceitamos aceitando deslocamentos deslocamento maiores longos longas longas distancias distancia grandes longe dedicar dedique favor importante tambem interessem interesses interesse '+Object.values(gateWords).flat().join(' ')).split(' '));
  const unknown=[...new Set(text.split(/\s+/).filter(w=>w&&!generic.has(w)&&!/^\d+$/.test(w)))];
  const explicitCategories=Object.entries(gateWords).filter(([,words])=>words.some(w=>(` ${text} `).includes(` ${w} `))).map(([key])=>key);
  return {confident:!restricted&&!restRequested&&!unknown.length,restricted,restRequested,unknownCount:unknown.length,
    categories:[...new Set([...preferences.interesses,...explicitCategories])],namedIds:named.map(p=>p.id),
    strongBeaches:explicitCategories.includes('praias')&&(/\b(priorizo|priorizar|prioridade|foco|principal|principalmente|prefiro|quero|gosto)\b/.test(text)||preferences.interesses.length===1&&preferences.interesses[0]==='praias')};
}

export function beachCandidate(place) {
  // Name is only a conservative selection signal; descriptions never infer facts from it.
  return place.types.includes('beach')||(/^praia (?:da |de |do |das |dos )?\S/.test(fold(place.name))&&place.types.some(t=>['tourist_attraction','natural_feature','landmark'].includes(t)));
}

export function candidateRelevant(place,scope) {
  return scope.namedIds.includes(place.id)||scope.categories.some(category=>category==='praias'?beachCandidate(place):
    (gateTypes[category]??[]).some(t=>place.types.includes(t)));
}

export function assessQuality(plan,prepared) {
  const scope=qualityScope(prepared.preferences,prepared.catalog);
  const calendar=tripCalendar(prepared.preferences.data_inicio,prepared.preferences.dias);
  const byId=new Map(prepared.catalog.map(p=>[p.id,p]));
  const locals=plan.dias.flatMap(d=>d.locais.map(l=>({...l,day:d.dia})));
  const used=new Set(locals.map(l=>l.id));
  const periods=new Map(prepared.catalog.map(p=>[p.id,openingPeriods(p.hours,p.hoursConflict)]));
  const weeks=calendar.length?new Map(prepared.catalog.map(p=>[p.id,openingPeriods(p.hours,p.hoursConflict,true).semana])):null;
  const possibleOnDay=(p,day)=>{
    const windows=weeks?.get(p.id)?.[calendar[day-1]?.semana];
    return !windows||windows.some(minutes=>minutes===null||minutes>0);
  };
  const eligible=p=>{
    const hp=periods.get(p.id);
    return !(hp.conhecidos===7&&hp.dias.every(n=>n===0))&&(!calendar.length||calendar.some(d=>possibleOnDay(p,d.dia)));
  };
  const unused=prepared.catalog.filter(p=>!used.has(p.id)&&eligible(p));
  const reasons=[],uncertain=[];
  for(const day of plan.dias) {
    if(day.locais.length>1&&day.locais.some(local=>byId.get(local.id)?.full_day===true)) {
      reasons.push({code:'FULL_DAY_SHARED',day:day.dia,
        message:'Uma atração full_day deve ocupar sozinha este dia. Reorganize ou remova as outras atrações sem priorizar artificialmente a atração full_day.',
        candidateIds:day.locais.map(local=>local.id)});
    }
  }
  for(const local of locals) {
    const hp=periods.get(local.id),period=PLANNING_PERIODS.indexOf(local.periodo);
    if(!byId.has(local.id)||period<0) throw new Error('INVALID_PLAN_FOR_GATE');
    if(calendar.length) {
      const date=calendar[local.day-1];
      const minutes=weeks.get(local.id)?.[date.semana]?.[period];
      if(minutes===0) reasons.push({code:'PERIOD_UNAVAILABLE',day:local.day,id:local.id,period:local.periodo,date:date.data,weekday:date.dia_semana,
        message:'O período escolhido não possui abertura no dia da semana correspondente à data da visita, segundo o cadastro semanal. Replaneje sem inventar funcionamento.',candidateIds:[local.id]});
      else if(minutes==null) uncertain.push({code:'WEEKDAY_AVAILABILITY_UNCERTAIN',day:local.day,id:local.id,date:date.data});
      continue;
    }
    if(hp.conhecidos===7&&hp.dias[period]===0) reasons.push({code:'PERIOD_UNAVAILABLE',day:local.day,id:local.id,period:local.periodo,
      message:'O período escolhido não tem abertura em nenhum dos sete dias cadastrados.',candidateIds:[local.id]});
    else if(hp.conhecidos<7||hp.dias[period]<7) uncertain.push({code:'WEEKDAY_AVAILABILITY_UNCERTAIN',day:local.day,id:local.id});
  }
  const emptyDays=plan.dias.filter(d=>d.locais.length===0).map(d=>d.dia);
  const relevantUnused=unused.filter(p=>candidateRelevant(p,scope));
  if(scope.confident&&emptyDays.length&&relevantUnused.length>=2*emptyDays.length&&emptyDays.every(day=>relevantUnused.filter(p=>possibleOnDay(p,day)).length>=2)) reasons.push({code:'EMPTY_DAYS_WITH_OPTIONS',days:emptyDays,
    available:relevantUnused.length,message:'Há dias vazios e pelo menos duas opções compatíveis não utilizadas por dia vazio. Reavalie o preenchimento com a IA.',candidateIds:relevantUnused.map(p=>p.id)});
  // This targets a clear imbalance in an explicit beach-focused request, not a quota per day.
  const usedBeaches=locals.filter(l=>beachCandidate(byId.get(l.id))).length;
  const unusedBeaches=unused.filter(beachCandidate);
  const discretionaryOthers=locals.filter(l=>!scope.namedIds.includes(l.id)&&!beachCandidate(byId.get(l.id))).length;
  if(scope.confident&&scope.strongBeaches&&prepared.preferences.dias>=2&&usedBeaches<=1&&unusedBeaches.length>=2&&discretionaryOthers>=2) {
    reasons.push({code:'STRONG_BEACH_PREFERENCE_UNDERSERVED',used:usedBeaches,available:unusedBeaches.length,
      message:'O pedido enfatiza praias, mas o plano usa no máximo uma, contém várias escolhas não solicitadas de outros tipos e há outras praias disponíveis. Corrija a aderência sem quota fixa por dia.',candidateIds:unusedBeaches.map(p=>p.id)});
  }
  if(!scope.confident) uncertain.push({code:'PREFERENCE_ASSESSMENT_CONSERVATIVE',unknownCount:scope.unknownCount,restricted:scope.restricted,restRequested:scope.restRequested});
  return {passed:reasons.length===0,reasons,uncertain,scope:{confident:scope.confident,strongBeaches:scope.strongBeaches},
    counts:{emptyDays:emptyDays.length,unusedRelevant:relevantUnused.length,usedBeaches,unusedBeaches:unusedBeaches.length}};
}

export function buildCorrectionContext(plan,gate,prepared) {
  const original=JSON.parse(prepared.context);
  const ids=new Set(plan.dias.flatMap(d=>d.locais.map(l=>l.id)));
  for(const reason of gate.reasons) for(const id of reason.candidateIds??[]) ids.add(id);
  for(const reason of gate.reasons.filter(r=>r.code==='PERIOD_UNAVAILABLE')) {
    const place=prepared.catalog.find(p=>p.id===reason.id);
    const scope=qualityScope(prepared.preferences,prepared.catalog);
    for(const p of prepared.catalog) if(candidateRelevant(p,scope)||p.types.some(t=>place.types.includes(t)&&!['tourist_attraction','food','store','natural_feature'].includes(t))) ids.add(p.id);
  }
  return JSON.stringify({preferencias_usuario:prepared.preferences,roteiro_atual:plan,falhas:gate.reasons,
    ...(original.calendario_viagem?{calendario_viagem:original.calendario_viagem}:{}),
    legenda_planejamento:original.legenda_planejamento,referencias_geograficas:original.referencias_geograficas,
    fatos_atracoes:original.fatos_atracoes.filter(p=>ids.has(p.id))});
}

export function parseQualityPlan(result) {
  let plan=result?.text??result;
  if(typeof plan==='string') plan=JSON.parse(plan.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
  return plan;
}

export function qualityEnvelope(plan,prepared,{attempt=0,initialGate=null,firstCallMs=0,correctionCallMs=0,now=Date.now()}={}) {
  if(attempt!==0&&attempt!==1) throw new Error('QUALITY_ATTEMPT_LIMIT');
  const gate=assessQuality(plan,prepared),remainingMs=55000-(now-prepared.startedAt);
  const needsCorrection=!gate.passed&&attempt===0&&remainingMs>1000;
  return {plan,gate,initialGate:initialGate??gate,attempt,needsCorrection,
    correctionContext:needsCorrection?buildCorrectionContext(plan,gate,prepared):undefined,
    correctionPreparedAt:needsCorrection?now:undefined,
    timing:{firstCallMs,correctionCallMs,totalMs:now-prepared.startedAt},
    finalResult:gate.passed?(attempt?'corrected':'passed_direct'):needsCorrection?'correction_required':attempt?'rejected_after_correction':'rejected_time_budget'};
}

export function qualityLog(envelope,requestId) {
  return {event:'explorasc_quality_gate',requestId,passed:envelope.gate.passed,
    initialPassed:envelope.initialGate.passed,initialReasons:envelope.initialGate.reasons.map(r=>r.code),
    reasons:envelope.gate.reasons.map(r=>r.code),uncertainties:envelope.gate.uncertain.map(r=>r.code),
    correctionAttempted:envelope.attempt===1,firstCallElapsedMs:envelope.timing.firstCallMs,
    correctionElapsedMs:envelope.timing.correctionCallMs,totalMs:envelope.timing.totalMs,result:envelope.finalResult};
}
