import assert from 'node:assert/strict';

const targets = [
  ['n8n Header Auth', 'https://bot-pousada-n8n-n8n.rv3uyd.easypanel.host/webhook/analizer'],
  ['Edge authentication', 'https://qivbamplrsohrrytxzpi.supabase.co/functions/v1/generate-itinerary'],
];
for (const [name,url] of targets) {
  const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
  await response.arrayBuffer();
  assert.ok([401,403].includes(response.status),`${name}: expected unauthorized, got ${response.status}`);
  console.log(`${name}: ${response.status} (no credentials or generation input sent)`);
}
