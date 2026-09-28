// Explicit remote smoke test: creates and removes one disposable account.
// Keys, links, tokens and passwords stay in memory and are never logged.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
  const index=line.indexOf('='); return [line.slice(0,index),line.slice(index+1).replace(/^["']|["']$/g,'')];
}));
const ref=readFileSync('supabase/.temp/project-ref','utf8').trim();
assert.match(ref,/^[a-z]{20}$/);
const keys=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`& npx supabase projects api-keys --project-ref ${ref} --output json`],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const keyList=Array.isArray(keys)?keys:keys.api_keys;
const serviceKey=keyList?.find(key=>key.name==='service_role')?.api_key;
assert.ok(serviceKey,'Service key unavailable');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(env.VITE_SUPABASE_URL,serviceKey,options);
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,options);
const email=`explorasc-credits-test-${randomUUID()}@example.com`;
let userId;
try {
  const created=await admin.auth.admin.createUser({email,password:randomUUID(),email_confirm:true});
  assert.equal(created.error,null,'Could not create disposable test user');
  userId=created.data.user.id;
  const redirectTo='http://localhost:5173/auth?mode=reset';
  const recovery=await admin.auth.admin.generateLink({type:'recovery',email,options:{redirectTo}});
  assert.equal(recovery.error,null,'Could not generate recovery link');
  const link=new URL(recovery.data.properties.action_link);
  console.log(`Recovery redirect preserved: ${link.searchParams.get('redirect_to')===redirectTo}`);
  const verified=await client.auth.verifyOtp({token_hash:recovery.data.properties.hashed_token,type:'recovery'});
  assert.equal(verified.error,null,'Recovery verification failed');
  const password=randomUUID();
  assert.equal((await client.auth.updateUser({password})).error,null,'Password update failed');
  await client.auth.signOut();
  assert.equal((await client.auth.signInWithPassword({email,password})).error,null,'Login with recovered password failed');
  const initial=await client.rpc('generation_credit_summary');
  assert.equal(initial.error,null,'Credit summary failed'); assert.equal(initial.data.balance,3);
  const denied=await client.from('generation_wallets').update({balance:100}).eq('user_id',userId);
  assert.ok(denied.error,'Client changed its own balance');
  const result=await admin.from('generation_wallets').update({balance:0}).eq('user_id',userId);
  assert.equal(result.error,null,'Could not prepare zero-credit fixture');
  const session=await client.auth.getSession();
  const url=`${env.VITE_SUPABASE_URL}/functions/v1/generate-itinerary`;
  const body=JSON.stringify({requestId:randomUUID(),texto:'',dias:1,interesses:[],regioes:['Grande Florianópolis']});
  const unauthorized=await fetch(url,{method:'POST',headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body});
  assert.equal(unauthorized.status,401,'Unauthenticated Edge call accepted');
  const response=await fetch(url,{method:'POST',headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.data.session.access_token}`,'Content-Type':'application/json'},body});
  assert.equal(response.status,402,'Zero-credit direct Edge call not blocked');
  assert.equal((await response.json()).code,'no_credits');
  assert.equal((await client.from('itineraries').select('id').limit(1)).error,null,'Zero credits block saved itineraries');
  await client.auth.signOut();
  await client.auth.signInWithPassword({email,password});
  assert.equal((await client.rpc('generation_credit_summary')).data.balance,0,'Balance lost on login');
  console.log('PASS: real recovery token -> password update -> login; initial credits; protected balance; direct Edge 401/402; saved access at zero; balance survives login. No AI call or email was sent.');
} finally {
  await client.auth.signOut();
  if(userId) assert.equal((await admin.auth.admin.deleteUser(userId)).error,null,'Disposable test account cleanup failed');
}
