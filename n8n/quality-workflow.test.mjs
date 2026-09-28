import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url),'utf8'));
const ops=read('./update-operations.json');
const nodes=ops.filter(o=>o.type==='addNode').map(o=>o.node);
const fixtures=read('./quality-gate-fixtures.json');
const code=name=>nodes.find(n=>n.name===name).parameters.jsCode;
function execute(name,payload,state,logs=[]) {
  return new Function('$input','$','$execution','console',code(name))({first:()=>({json:payload})},n=>({first:()=>({json:state[n]})}),{id:'offline'},{log:s=>logs.push(JSON.parse(s))})[0].json;
}
test('all generated Code nodes compile; primary prompt and original validator are unchanged',()=>{
  for(const n of nodes.filter(n=>n.type==='n8n-nodes-base.code')) new Function('$input','$','$execution',n.parameters.jsCode);
  assert.equal(nodes.find(n=>n.name==='Montar roteiro').parameters.messages.messageValues[0].message,readFileSync(new URL('./system-prompt.txt',import.meta.url),'utf8'));
  const original=readFileSync(new URL('./validate-itinerary.code.txt',import.meta.url),'utf8');
  assert.ok(code('Quality gate').includes(original));
  assert.ok(code('Reavaliar correção').includes(original));
});
test('generated normal and corrective paths preserve outputs and cannot loop',()=>{
  for(const f of fixtures) {
    const prepared={...f.prepared,startedAt:Date.now()-100,preparedAt:Date.now()-80};
    const state={'Webhook':{body:f.preferences},'Preparar candidatos':prepared,'Montar roteiro':f.modelPlan};
    const hydrated=execute('Recuperar locais reais',f.modelPlan,state);
    const gate=execute('Quality gate',hydrated,state);
    state['Quality gate']=gate;
    assert.equal(gate.quality.gate.passed,f.expectedInitial.passed);
    if(gate.quality.gate.passed) assert.equal(execute('Finalizar qualidade',gate,state).output,hydrated.output);
    else {
      assert.equal(gate.quality.needsCorrection,true);
      // Replaying the same bad response models a failed correction, without another API call.
      const rechecked=execute('Reavaliar correção',f.modelPlan,state);
      assert.equal(rechecked.quality.needsCorrection,false);
      assert.equal(rechecked.quality.attempt,1);
      assert.throws(()=>execute('Finalizar qualidade',rechecked,state),/QUALITY_GATE_REJECTED/);
      const error=execute('Registrar falha da correção',{},state);
      assert.equal(error.qualityObservation.correctionAttempted,true);
      assert.equal(error.error,'CORRECTION_FAILED');
    }
  }
  const edges=ops.filter(o=>o.type==='addConnection'&&o.connectionType==='main');
  const outgoing=n=>edges.filter(e=>e.source===n).map(e=>e.target);
  const walk=(n,path=[])=>{assert.ok(!path.includes(n),'Cycle allows an extra correction');for(const target of outgoing(n)) walk(target,[...path,n]);};
  walk('Webhook');
  assert.ok(!outgoing('Reavaliar correção').includes('Corrigir roteiro'));
  assert.equal(ops.find(o=>o.type==='updateNodeParameters'&&o.nodeName==='OpenRouter Chat Model').parameters.options.maxRetries,0);
  assert.equal(ops.filter(o=>o.type==='addConnection'&&o.source==='OpenRouter Chat Model'&&o.connectionType==='ai_languageModel').length,2);
});
test('corrected invalid identities/structure never bypass original validation',()=>{
  const f=fixtures.find(f=>f.label==='B'),prepared={...f.prepared,startedAt:Date.now(),preparedAt:Date.now()};
  const state={'Webhook':{body:f.preferences},'Preparar candidatos':prepared,'Montar roteiro':f.modelPlan};
  const hydrated=execute('Recuperar locais reais',f.modelPlan,state);
  state['Quality gate']=execute('Quality gate',hydrated,state);
  const corrupt=structuredClone(f.modelPlan);corrupt.dias[0].locais[0].id='not-in-source';
  assert.throws(()=>execute('Reavaliar correção',corrupt,state),/INVALID_OR_DUPLICATE_PLACE/);
  const invalid=structuredClone(f.modelPlan);invalid.dias[0].locais[0].periodo='fake-period';
  assert.throws(()=>execute('Reavaliar correção',invalid,state),/periodo/);
});
test('generated workflow sends FULL_DAY_SHARED to its corrective call and accepts a revalidated day',()=>{
  const f=structuredClone(fixtures.find(f=>f.label==='A'));
  const fullDayId=f.modelPlan.dias[0].locais[0].id;
  f.prepared.catalog.find(p=>p.id===fullDayId).full_day=true;
  const context=JSON.parse(f.prepared.context);
  context.fatos_atracoes.find(p=>p.id===fullDayId).full_day=true;
  f.prepared.context=JSON.stringify(context);
  const prepared={...f.prepared,startedAt:Date.now()-100,preparedAt:Date.now()-80};
  const state={'Webhook':{body:f.preferences},'Preparar candidatos':prepared,'Montar roteiro':f.modelPlan};
  const hydrated=execute('Recuperar locais reais',f.modelPlan,state);
  const first=execute('Quality gate',hydrated,state);
  assert.deepEqual(first.quality.gate.reasons.map(r=>r.code),['FULL_DAY_SHARED']);
  assert.equal(first.quality.needsCorrection,true);
  assert.equal(JSON.parse(first.quality.correctionContext).fatos_atracoes.find(p=>p.id===fullDayId).full_day,true);
  state['Quality gate']=first;
  const corrected=structuredClone(f.modelPlan);
  corrected.dias[0].locais=corrected.dias[0].locais.slice(0,1);
  const rechecked=execute('Reavaliar correção',corrected,state);
  assert.equal(rechecked.quality.gate.passed,true);
  assert.equal(rechecked.quality.finalResult,'corrected');
  assert.equal(execute('Finalizar qualidade',rechecked,state).qualityObservation.result,'corrected');
});
