import {readFileSync,writeFileSync} from 'node:fs';
import {assessQuality,beachCandidate} from './quality-gate.mjs';
import {openingPeriods} from './planning-context.mjs';

const saved=JSON.parse(readFileSync(new URL('./planning-benchmark-evidence.json',import.meta.url),'utf8'));
const make=(label,run,preferences,modelPlan)=>{
  const context=JSON.parse(run.context);context.preferencias_usuario=preferences;
  const prepared={catalog:run.catalog,preferences,bases:run.bases,context:JSON.stringify(context),metrics:run.metrics,
    requestId:`quality-test-${label}`,startedAt:0,preparedAt:0};
  return {label,preferences,prepared,modelPlan,expectedInitial:assessQuality(modelPlan,prepared)};
};
const base=saved.runs[0],empty=saved.runs[3],large=saved.runs[2];
const prefsC={...base.preferences,dias:3,interesses:['praias'],texto:'Quero priorizar praias diferentes.'};
const beach=base.catalog.find(beachCandidate);
const others=base.catalog.filter(p=>!beachCandidate(p)&&!(openingPeriods(p.hours,p.hoursConflict).dias?.[1]===0)).slice(0,4);
const local=(p,periodo='tarde')=>({id:p.id,periodo,duracao_minutos:90});
const C={dias:[{dia:1,locais:[local(beach,'manha'),local(others[0])]},{dia:2,locais:[local(others[1]),local(others[2])]},{dia:3,locais:[local(others[3])]}]};
const norden=large.catalog.find(p=>p.name==='Norden Blumenau');
const cases=[
  make('A',base,base.preferences,base.modelResult),
  make('B',empty,empty.preferences,empty.modelResult),
  make('C',base,prefsC,C),
  make('D',large,{...large.preferences,dias:1,interesses:['gastronomia'],texto:''},{dias:[{dia:1,locais:[local(norden,'manha')]}]}),
  make('E',empty,{...empty.preferences,dias:1},{dias:[empty.modelResult.dias[0]]}),
];
if(process.argv[2]) {
  const selected=cases.find(c=>c.label===process.argv[2]);
  if(!selected) throw new Error('UNKNOWN_FIXTURE');
  console.log(JSON.stringify(selected));
} else {
  writeFileSync(new URL('./quality-gate-fixtures.json',import.meta.url),JSON.stringify(cases,null,2));
  console.log(JSON.stringify(cases.map(c=>({label:c.label,passed:c.expectedInitial.passed,reasons:c.expectedInitial.reasons.map(r=>r.code),uncertainties:c.expectedInitial.uncertain.map(r=>r.code)})),null,2));
}
