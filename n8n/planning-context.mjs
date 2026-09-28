// Advisory context only: never filters candidates, groups visits or sorts an itinerary.
export const PLANNING_PERIODS = ['manha','tarde','noite'];
export const PERIOD_WINDOWS = [[360,720],[720,1080],[1080,1440]];

export function haversineKm(a,b) {
  const rad=n=>n*Math.PI/180;
  const h=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}

export function geographicContext(catalog) {
  if (!catalog.length) return {references:[],distances:new Map()};
  // Axis extremes are landmarks, not centroids or cluster assignments.
  // Each candidate gets distances to the SAME references, in the SAME order.
  const references=[];
  for (const [axis,sign] of [['lat',1],['lat',-1],['lon',1],['lon',-1]]) {
    const anchor=catalog.reduce((best,p)=>sign*p[axis]<sign*best[axis] ||
      (p[axis]===best[axis]&&p.id.localeCompare(best.id)<0) ? p : best);
    if (!references.some(p=>p.id===anchor.id)) references.push(anchor);
  }
  return {
    references:references.map(p=>({id:p.id,n:p.name,c:[p.lat,p.lon]})),
    distances:new Map(catalog.map(p=>[p.id,references.map(anchor=>Math.round(haversineKm(p,anchor)*10)/10)])),
  };
}

const scheduleText=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const weekdays=[['segunda-feira','segunda','monday'],['terca-feira','terca','tuesday'],['quarta-feira','quarta','wednesday'],
  ['quinta-feira','quinta','thursday'],['sexta-feira','sexta','friday'],['sabado','saturday'],['domingo','sunday']];

export function parseOpeningSchedule(schedule) {
  const text=scheduleText(schedule);
  if (['fechado','closed'].includes(text)) return [];
  if (['atendimento 24 horas','aberto 24 horas','open 24 hours','24 horas'].includes(text)) return [[0,1440]];
  if (!text) return null;
  const intervals=[];
  for (const part of text.split(/[,;]/)) {
    const match=/^\s*(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*$/.exec(part);
    if (!match) return null;
    const [,h1,m1,h2,m2]=match.map(Number);
    if (h1>23||m1>59||h2>24||m2>59||(h2===24&&m2!==0)) return null;
    const start=h1*60+m1;
    let end=h2*60+m2;
    // Equal endpoints are ambiguous, not an implicit 24-hour opening.
    if (end===start) return null;
    if (end<start) end+=1440;
    intervals.push([start,end]);
  }
  return intervals.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
}

function mergeOpeningIntervals(intervals) {
  const sorted=intervals.map(r=>[...r]).sort((a,b)=>a[0]-b[0]);
  const result=[];
  for (const [start,end] of sorted) {
    const last=result.at(-1);
    if (last&&start<=last[1]) last[1]=Math.max(last[1],end);
    else result.push([start,end]);
  }
  return result;
}

export function openingPeriods(hours,conflict=false,includeWeek=false) {
  const days=Array.from({length:7},()=>({seen:false,invalid:false,intervals:null}));
  for (const line of hours??[]) {
    if (typeof line!=='string') continue;
    const colon=line.indexOf(':');
    if (colon<0) continue;
    const weekday=weekdays.findIndex(names=>names.includes(scheduleText(line.slice(0,colon))));
    if (weekday<0) continue;
    const parsed=parseOpeningSchedule(line.slice(colon+1));
    const day=days[weekday];
    if (parsed===null||(day.seen&&JSON.stringify(day.intervals)!==JSON.stringify(parsed))) day.invalid=true;
    day.seen=true;
    day.intervals=parsed;
  }
  const known=days.map(d=>!conflict&&d.seen&&!d.invalid&&d.intervals!==null);
  const windows=days.map((day,i)=>{
    if (!known[i]) return null;
    const ranges=day.intervals.map(([a,b])=>[a,Math.min(1440,b)]);
    const previous=(i+6)%7;
    if (known[previous]) for (const [,end] of days[previous].intervals) {
      if (end>1440) ranges.push([0,end-1440]);
    }
    const merged=mergeOpeningIntervals(ranges);
    return PERIOD_WINDOWS.map(([start,end])=>merged.reduce((max,[a,b])=>Math.max(max,Math.max(0,Math.min(end,b)-Math.max(start,a))),0));
  });
  const knownDays=known.filter(Boolean).length;
  const median=values=>{
    const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
    return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
  };
  return {
    ...(includeWeek ? {semana:windows.map((w,i)=>w?.map(minutes=>minutes===0&&!known[(i+6)%7]?null:minutes)??null)} : {}),
    conhecidos:knownDays,
    dias:knownDays?PLANNING_PERIODS.map((_,p)=>windows.filter(w=>w&&w[p]>0).length):null,
    janela_tipica:knownDays?PLANNING_PERIODS.map((_,p)=>median(windows.filter(Boolean).map(w=>w[p]))):null,
    janela_max:knownDays?PLANNING_PERIODS.map((_,p)=>Math.max(...windows.filter(Boolean).map(w=>w[p]))):null,
    ...(conflict?{conflito:true}:{}),
  };
}

export function planningHints(catalog,calendar=[]) {
  const geography=geographicContext(catalog);
  return {
    references:geography.references,
    byId:new Map(catalog.map(p=>[p.id,{geo_km:geography.distances.get(p.id),hp:openingPeriods(p.hours,p.hoursConflict),
      ...(calendar.length?{hd:calendar.map(d=>openingPeriods(p.hours,p.hoursConflict,true).semana[d.semana])}:{})}])),
    legend:{
      ...(calendar.length?{hd:'Uma linha por dia de calendario_viagem; colunas manha/tarde/noite. Minutos da maior janela contínua cadastrada nesse dia da semana. Zero = sem abertura cadastrada; null = informação ausente, incompleta ou conflitante. Prefira períodos compatíveis. Referência semanal, não confirmação em tempo real; feriados e exceções não estão confirmados.'}:{}),
      geo_km:'Distâncias Haversine aproximadas em km, na ordem de referencias_geograficas; linha reta, não trajeto nem tempo de viagem. Referências não são grupos ou visitas obrigatórias.',
      hp:'Ordem dos vetores: manha(06–12), tarde(12–18), noite(18–24). conhecidos: dias semanais interpretados/7. dias: quantos têm alguma abertura por período. janela_tipica: mediana da maior janela contínua por período, em minutos, incluindo zero nos dias conhecidos sem abertura. janela_max: maior dessas janelas. Demais dias/desconhecidos não significam fechado. Null = desconhecido. Confira h para dias e horários exatos; '+(calendar.length?'use hd para as datas da viagem.':'não há data de viagem.'),
    },
  };
}

// Diagnostics do not block, select, replace, move or retry any visit.
export function diagnosePlanning(itinerary,factualAudit,catalog) {
  const byId=new Map(catalog.map(p=>[p.id,p]));
  const byOrder=new Map(factualAudit.map(p=>[p.order,byId.get(p.id)]));
  return itinerary.dias.map(day=>{
    const places=day.locais.map(l=>byOrder.get(l.ordem));
    const legs=places.slice(1).map((p,i)=>({from:places[i].id,to:p.id,straightLineKm:Math.round(haversineKm(places[i],p)*10)/10}));
    const hours=day.locais.map((l,i)=>{
      const source=places[i],hp=openingPeriods(source.hours,source.hoursConflict),period=PLANNING_PERIODS.indexOf(l.periodo);
      const available=hp.dias?.[period]??null;
      return {id:source.id,period:l.periodo,knownDays:hp.conhecidos,daysWithOpening:available,
        typicalWindowMinutes:hp.janela_tipica?.[period]??null,maxWindowMinutes:hp.janela_max?.[period]??null,
        assessment:!hp.conhecidos?'unknown':available===0?(hp.conhecidos===7?'no_registered_opening':'no_opening_in_known_days'):
          available<hp.conhecidos/2?'limited_days':'supported_in_known_days'};
    });
    return {day:day.dia,legs,totalStraightLineKm:Math.round(legs.reduce((s,l)=>s+l.straightLineKm,0)*10)/10,
      longLegsForReview:legs.filter(l=>l.straightLineKm>50).length,hours};
  });
}
