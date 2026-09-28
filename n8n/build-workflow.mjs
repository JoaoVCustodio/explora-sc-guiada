import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const before = JSON.parse(readFileSync(join(dir,'tcc-v0.1.before.json'),'utf8'));
const source = readFileSync(join(dir,'../supabase/functions/_shared/calendar-date.mjs'),'utf8').replace(/^export /gm,'')+'\n'+
  readFileSync(join(dir,'planning-context.mjs'),'utf8').replace(/^export /gm,'')+'\n'+
  readFileSync(join(dir,'pipeline.mjs'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const prompt = readFileSync(join(dir,'system-prompt.txt'),'utf8');
const correctionPrompt = readFileSync(join(dir,'correction-prompt.txt'),'utf8');
const gateSource = source+'\n'+readFileSync(join(dir,'quality-gate.mjs'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const validatorSource = readFileSync(join(dir,'validate-itinerary.code.txt'),'utf8');
const validateForGate = '\nconst validateForGate = ($input,$) => {\n'+validatorSource+'\n};\n';
const modelConfig = JSON.parse(readFileSync(join(dir,'model-config.json'),'utf8'));
const modelOptions = {...modelConfig.options,timeout:'={{ Math.max(1000, 55000 - (Date.now() - $("Selecionar bases").first().json.startedAt)) }}'};
const code = (name, jsCode, x) => ({ name, type:'n8n-nodes-base.code', typeVersion:2, position:[x,0], parameters:{mode:'runOnceForAllItems',language:'javaScript',jsCode} });
const planning = code('Selecionar bases', source + '\nreturn [{json: planRequest($input.first().json.body, $execution.id)}];',260);
const sheets = { name:'Consultar bases selecionadas',type:'n8n-nodes-base.httpRequest',typeVersion:4.4,position:[520,0],
  credentials:{googleSheetsOAuth2Api:{id:'6W6HunGVyENWLNuB',name:'Google Sheets account'}},
  parameters:{method:'GET',url:'https://sheets.googleapis.com/v4/spreadsheets/135JySnG-ulzk-_t-dyJWRU8JXc4ZMxuAptcEyGvM2XI/values:batchGet',
    authentication:'predefinedCredentialType',nodeCredentialType:'googleSheetsOAuth2Api',sendQuery:true,specifyQuery:'json',
    jsonQuery:'={{ JSON.stringify({ ranges: $json.ranges, majorDimension: "ROWS", valueRenderOption: "UNFORMATTED_VALUE" }) }}',
    options:{queryParameterArrays:'repeat',timeout:10000,response:{response:{responseFormat:'json'}},redirect:{redirect:{followRedirects:false}}}} };
const prepare = code('Preparar candidatos',source + '\nconst started = Date.now();\nconst prepared = prepareCandidates($input.first().json, $("Selecionar bases").first().json);\nprepared.metrics.preprocessingMs = Date.now() - started;\nprepared.preparedAt = Date.now();\nconsole.log(JSON.stringify({event:"explorasc_candidates",requestId:prepared.requestId,...prepared.metrics}));\nreturn [{json:prepared}];',780);
const chain = {name:'Montar roteiro',type:'@n8n/n8n-nodes-langchain.chainLlm',typeVersion:1.9,position:[1040,0],
  parameters:{promptType:'define',text:'={{ $json.context }}',hasOutputParser:false,needsFallback:false,
    messages:{messageValues:[{type:'SystemMessagePromptTemplate',message:prompt}]},batching:{batchSize:1,delayBetweenBatches:0}}};
const hydrate = code('Recuperar locais reais',source + '\nconst responseAt=Date.now();\nconst prepared = $("Preparar candidatos").first().json;\nconst result = $input.first().json;\nconst {itinerary:output,factualAudit} = hydrateItineraryResult(result.text ?? result, prepared);\nconst planningDiagnostics = diagnosePlanning(output,factualAudit,prepared.catalog);\nconsole.log(JSON.stringify({event:"explorasc_model_complete",requestId:prepared.requestId,modelAndSchedulingMs:responseAt-prepared.preparedAt,elapsedMs:Date.now()-prepared.startedAt,places:output.dias.reduce((n,d)=>n+d.locais.length,0),deterministicDescriptions:factualAudit.length,longLegsForReview:planningDiagnostics.reduce((n,d)=>n+d.longLegsForReview,0)}));\nreturn [{json:{output:JSON.stringify(output),factualAudit,planningDiagnostics,firstCallElapsedMs:responseAt-prepared.preparedAt}}];',1300);
const quality = code('Quality gate',gateSource+validateForGate+'\nvalidateForGate($input,$);\nconst payload=$input.first().json;\nconst prepared=$("Preparar candidatos").first().json;\nconst plan=parseQualityPlan($("Montar roteiro").first().json);\nconst quality=qualityEnvelope(plan,prepared,{firstCallMs:payload.firstCallElapsedMs});\nconsole.log(JSON.stringify(qualityLog(quality,prepared.requestId)));\nreturn [{json:{...payload,quality}}];',1560);
const decision={name:'Precisa corrigir?',type:'n8n-nodes-base.if',typeVersion:2.3,position:[1820,0],parameters:{
  conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.quality.needsCorrection }}',rightValue:true,operator:{type:'boolean',operation:'equals'}}],combinator:'and'},options:{}}};
const correction={...chain,name:'Corrigir roteiro',position:[2080,-180],parameters:{...chain.parameters,text:'={{ $json.quality.correctionContext }}',messages:{messageValues:[{type:'SystemMessagePromptTemplate',message:correctionPrompt}]}}};
const recheck=code('Reavaliar correção',gateSource+validateForGate+'\nconst responseAt=Date.now();\nconst prepared=$("Preparar candidatos").first().json;\nconst initial=$("Quality gate").first().json.quality;\nconst plan=parseQualityPlan($input.first().json);\nconst {itinerary:output,factualAudit}=hydrateItineraryResult(plan,prepared);\nconst payload={output:JSON.stringify(output),factualAudit,planningDiagnostics:diagnosePlanning(output,factualAudit,prepared.catalog)};\nvalidateForGate({first:()=>({json:payload})},$);\nconst quality=qualityEnvelope(plan,prepared,{attempt:1,initialGate:initial.initialGate,firstCallMs:initial.timing.firstCallMs,correctionCallMs:responseAt-initial.correctionPreparedAt});\nreturn [{json:{...payload,quality}}];',2340,-180);
recheck.position=[2340,-180];
const finish=code('Finalizar qualidade',gateSource+'\nconst payload=$input.first().json;\nconst prepared=$("Preparar candidatos").first().json;\nconst quality=payload.quality;\nquality.timing.totalMs=Date.now()-prepared.startedAt;\nconst observation=qualityLog(quality,prepared.requestId);\nconsole.log(JSON.stringify(observation));\nif(!quality.gate.passed) throw new Error("QUALITY_GATE_REJECTED");\nreturn [{json:{...payload,qualityObservation:observation}}];',2600);
const correctionFailure=code('Registrar falha da correção','const initial=$("Quality gate").first().json.quality;\nconst prepared=$("Preparar candidatos").first().json;\nconst observation={event:"explorasc_quality_gate",requestId:prepared.requestId,passed:false,initialPassed:initial.initialGate.passed,initialReasons:initial.initialGate.reasons.map(r=>r.code),reasons:["CORRECTION_TECHNICAL_OR_STRUCTURAL_FAILURE"],correctionAttempted:true,firstCallElapsedMs:initial.timing.firstCallMs,correctionElapsedMs:Date.now()-initial.correctionPreparedAt,totalMs:Date.now()-prepared.startedAt,result:"rejected_correction_failure"};\nconsole.log(JSON.stringify(observation));\nreturn [{json:{error:"CORRECTION_FAILED",qualityObservation:observation}}];',2600);
correctionFailure.position=[2600,400];
const added = [planning,sheets,prepare,chain,hydrate,quality,decision,correction,recheck,finish,correctionFailure];
const mainAdded=added;
const oldNames = before.nodes.filter(n=>n.name==='AI Agent'||n.type==='n8n-nodes-base.googleSheetsTool').map(n=>n.name);
const main = ['Webhook',planning.name,sheets.name,prepare.name,chain.name,hydrate.name,quality.name,decision.name];
const edges=[...main.slice(0,-1).map((name,i)=>[name,main[i+1],0]),
  [decision.name,correction.name,0],[decision.name,finish.name,1],[correction.name,recheck.name,0],[recheck.name,finish.name,0],
  [finish.name,'Validar itinerário',0],[correctionFailure.name,'Responder erro de validação',0]];
const errorEdges=mainAdded.filter(n=>n.name!==decision.name&&n.name!==correctionFailure.name).map(n=>[n.name,
  [correction.name,recheck.name].includes(n.name)?correctionFailure.name:'Responder erro de validação',1]);
errorEdges.push([decision.name,'Responder erro de validação',2],[correctionFailure.name,'Responder erro de validação',1]);
const operations = [
  ...oldNames.map(nodeName=>({type:'removeNode',nodeName})),
  ...added.map(n=>({type:'addNode',node:n})),
  ...mainAdded.map(n=>({type:'setNodeSettings',nodeName:n.name,settings:{onError:'continueErrorOutput',retryOnFail:false,executeOnce:true}})),
  {type:'updateNodeParameters',nodeName:'OpenRouter Chat Model',parameters:{model:modelConfig.model,options:modelOptions}},
  {type:'setNodePosition',nodeName:'OpenRouter Chat Model',position:[1040,240]},
  {type:'setNodePosition',nodeName:'Validar itinerário',position:[2860,0]},
  {type:'setNodePosition',nodeName:'Respond to Webhook',position:[3120,0]},
  {type:'setNodePosition',nodeName:'Responder erro de validação',position:[1040,500]},
  ...[...edges,...errorEdges].map(([source,target,sourceIndex])=>({type:'addConnection',source,target,connectionType:'main',sourceIndex,targetIndex:0})),
  {type:'addConnection',source:'OpenRouter Chat Model',target:'Montar roteiro',connectionType:'ai_languageModel',sourceIndex:0,targetIndex:0},
  {type:'addConnection',source:'OpenRouter Chat Model',target:correction.name,connectionType:'ai_languageModel',sourceIndex:0,targetIndex:0},
];
writeFileSync(join(dir,'update-operations.json'),JSON.stringify(operations,null,2));
const preserved = before.nodes.filter(n=>!oldNames.includes(n.name));
const allNodes = [...preserved,...added].map(n=> n.name==='OpenRouter Chat Model' ? {...n,parameters:{model:modelConfig.model,options:modelOptions}} : n);
const serialize = v => {
  if(typeof v==='string') return v.startsWith('=') ? `expr(${JSON.stringify(v.slice(1))})` : JSON.stringify(v);
  if(Array.isArray(v)) return '['+v.map(serialize).join(',')+']';
  if(v && typeof v==='object') return '{'+Object.entries(v).map(([k,v])=>JSON.stringify(k)+':'+serialize(v)).join(',')+'}';
  return JSON.stringify(v);
};
const byName = new Map(allNodes.map((n,i)=>[n.name,`n${i}`]));
const samples = {
  'Webhook': {body:{dias:2,regioes:['Grande Florianópolis'],interesses:['praias'],texto:''}},
  'Selecionar bases': {ranges:["'Florianopolis'"],bases:[['Grande Florianópolis','base_Florianopolis','Florianopolis']],preferences:{dias:2},startedAt:1},
  'Consultar bases selecionadas': {valueRanges:[{range:'Florianopolis!A1:T2',values:[['id','displayName','location','types']]}]},
  'Preparar candidatos': {context:'{"preferencias_usuario":{"dias":2},"fatos_atracoes":[]}',catalog:[],requestId:'n8n-example',metrics:{}},
  'Montar roteiro': {dias:[{dia:1,locais:[{id:'p1',periodo:'manha',duracao_minutos:90}]}]},
  'Recuperar locais reais': {output:'{"titulo":"Exemplo","dias":[]}'},
  'Quality gate': {output:'{"titulo":"Exemplo","dias":[]}',quality:{needsCorrection:true,correctionContext:'{"roteiro_atual":{"dias":[]}}'}},
  'Precisa corrigir?': {quality:{needsCorrection:true,correctionContext:'{"roteiro_atual":{"dias":[]}}'}},
  'Corrigir roteiro': {dias:[{dia:1,locais:[{id:'p1',periodo:'manha',duracao_minutos:90}]}]},
  'Reavaliar correção': {output:'{"titulo":"Exemplo","dias":[]}',quality:{needsCorrection:false,gate:{passed:true}}},
  'Finalizar qualidade': {output:'{"titulo":"Exemplo","dias":[]}'},
  'Validar itinerário': {titulo:'Exemplo',descricao_geral:'Resumo',dias:[],fonte:'base_Florianopolis'},
};
let sdk = "import {workflow,node,trigger,languageModel,ifElse,newCredential,expr} from '@n8n/workflow-sdk';\n";
const isModel=n=>n.type==='@n8n/n8n-nodes-langchain.lmChatOpenRouter';
const ordered = [...allNodes.filter(isModel),...allNodes.filter(n=>!isModel(n))];
for (const n of ordered) {
  const factory = isModel(n) ? 'languageModel' : n.name==='Webhook' ? 'trigger':n.name===decision.name?'ifElse':'node';
  const config = {name:n.name,parameters:n.parameters,position:n.position,onError:n.onError ?? (mainAdded.some(a=>a.name===n.name)?'continueErrorOutput':undefined),executeOnce:mainAdded.some(a=>a.name===n.name)?true:undefined};
  let extra = '';
  if(n.name==='Montar roteiro') extra += `,subnodes:{model:${byName.get('OpenRouter Chat Model')}}`;
  if(n.name===correction.name) extra += `,subnodes:{model:${byName.get('OpenRouter Chat Model')}}`;
  if(isModel(n)) extra += ',credentials:{openRouterApi:newCredential("Existing OpenRouter credential")}';
  if(n.name==='Webhook') extra += ',credentials:{httpHeaderAuth:newCredential("Existing ExploraSC Header Auth")}';
  if(n.name===sheets.name) extra += ',credentials:{googleSheetsOAuth2Api:newCredential("Google Sheets account")}';
  sdk += `const ${byName.get(n.name)}=${factory}({type:${JSON.stringify(n.type)},version:${n.typeVersion},config:${serialize(config).slice(0,-1)}${extra}},output:${JSON.stringify([samples[n.name]??{}])}});\n`;
}
sdk += `export default workflow(${JSON.stringify(before.id)},'TCC v0.1').add(${byName.get(main[0])})`;
for(const name of main.slice(1,-1)) sdk += `.to(${byName.get(name)})`;
sdk+=`.to(${byName.get(decision.name)}.onTrue(${byName.get(correction.name)}.to(${byName.get(recheck.name)}).to(${byName.get(finish.name)})).onFalse(${byName.get(finish.name)}))`;
sdk+=`.add(${byName.get(finish.name)}).to(${byName.get('Validar itinerário')}).to(${byName.get('Respond to Webhook')})`;
sdk+=`.add(${byName.get(correctionFailure.name)}).to(${byName.get('Responder erro de validação')})`;
for(const [name,target] of [...errorEdges,['Validar itinerário','Responder erro de validação']]) sdk += `.add(${byName.get(name)}.onError(${byName.get(target)}))`;
sdk += ';\n';
writeFileSync(join(dir,'workflow.sdk.js'),sdk);
console.log(JSON.stringify({newNodes:added.map(n=>n.name),removedNodes:oldNames,operations:operations.length}));
