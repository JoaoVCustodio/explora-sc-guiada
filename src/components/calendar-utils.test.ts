import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarCells,shiftCalendarMonth} from './calendar-utils.ts';
test('calendar grid is stable, starts Monday and contains leap day',()=>{
  const cells=calendarCells('2028-02');
  assert.equal(cells.length,42);assert.equal(cells[0],'2028-01-31');
  assert.ok(cells.includes('2028-02-29'));
  assert.equal(new Set(cells).size,42);
});
test('keyboard month/year navigation clamps dates rather than skipping months',()=>{
  assert.equal(shiftCalendarMonth('2026-01-31',1),'2026-02-28');
  assert.equal(shiftCalendarMonth('2028-02-29',12),'2029-02-28');
  assert.equal(shiftCalendarMonth('2026-01-16',-1),'2025-12-16');
  assert.equal(shiftCalendarMonth('1000-01-01',-1),'1000-01-01');
});
