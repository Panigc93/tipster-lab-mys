import test from 'node:test';import assert from 'node:assert/strict';
import {parseCsv,activityFunnel} from '../app/src/funnel.mjs';
const NOW='2026-10-30T14:20:00Z';
const csv='slug,name,last_pick_at\na,"A, uno",2026-10-30 09:38:49.979+00\nb,B,\nc,C,2026-05-01 00:00:00+00\nd,D,2026-10-31 00:00:00+00\ne,E,2026-08-01T00:00:00Z\n';
test('parses quoted CSV',()=>{const r=parseCsv(csv);assert.equal(r.length,5);assert.equal(r[0].name,'A, uno');});
test('unknown date is distinct from old and future',()=>{const f=activityFunnel(parseCsv(csv),{now:NOW});assert.deepEqual([f.total,f.activos,f.sin_fecha,f.antiguos,f.fecha_futura],[5,1,1,2,1]);assert.deepEqual(f.slugsActivos,["a"]);});
test('boundary exactly 90 days is active; invalid date throws',()=>{const f=activityFunnel([{slug:'x',last_pick_at:'2026-08-01 14:20:00+00'}],{now:NOW});assert.equal(f.activos,1);assert.throws(()=>activityFunnel([{slug:'y',last_pick_at:'ayer'}],{now:NOW}));assert.throws(()=>activityFunnel([],{now:'x'}));});
