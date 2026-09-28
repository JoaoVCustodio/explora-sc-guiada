import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrateItineraryResult} from './pipeline.mjs';
import {assessQuality} from './quality-gate.mjs';
import {normalizeItineraryResponse} from '../supabase/functions/_shared/itinerary-schema.ts';
import {tripCalendar} from '../supabase/functions/_shared/calendar-date.mjs';
const runs=JSON.parse(readFileSync(new URL('./calendar-date-evidence.json',import.meta.url),'utf8'));
for(const run of runs) {
  const prefs=run.prepared.preferences,calendar=tripCalendar(prefs.data_inicio,prefs.dias);
  assert.deepEqual(JSON.parse(run.prepared.context).calendario_viagem,calendar);
  assert.deepEqual(run.output.dias.map(d=>d.data),calendar.map(d=>d.data));
  assert.deepEqual(hydrateItineraryResult(run.plan,run.prepared).itinerary,run.output);
  assert.equal(assessQuality(run.plan,run.prepared).passed,true);
  assert.equal(run.models.length,1);
  const normalized=normalizeItineraryResponse(run.output,prefs.dias);
  assert.deepEqual(normalized.days.map(d=>d.date),calendar.map(d=>d.data));
}
console.log('Two real draft executions verified: dates, contract, factual grounding, quality gate and one model call.');
