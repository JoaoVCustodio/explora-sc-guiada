import {writeFileSync} from 'node:fs';
const response = await fetch('https://openrouter.ai/api/v1/models', {signal:AbortSignal.timeout(15000)});
if (!response.ok) throw new Error(`Model catalog HTTP ${response.status}`);
const {data} = await response.json();
const models = data.filter(m => /deepseek-v4-flash$|gemini-3\.[15]-flash-lite$|mistral-small-2603$/.test(m.id))
  .map(({id,name,context_length,supported_parameters,top_provider,description})=>({id,name,context_length,supported_parameters,top_provider,description}));
writeFileSync(new URL('./model-benchmark-catalog.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),models},null,2));
console.log(JSON.stringify(models,null,2));
