import test from 'node:test';import assert from 'node:assert/strict';
import {parseInput,parseCSV,normalizePicks,summarize,stress,temporalSplit,dailyBootstrap,overlaps,demoPicks} from '../app/src/engine.mjs';
const row=(x={})=>({id:'1',tipster:'A',date:'2026-01-01',stake:1,odds:2,result:'win',...x});
const norm=rows=>normalizePicks(rows).picks;
test('yield uses stake, not count',()=>{const s=summarize(norm([row(),row({id:'2',stake:10,result:'loss'})]));assert.equal(s.profit,-9);assert.equal(s.yield,-900/11);});
test('drawdown includes initial loss and partial recoveries',()=>{const s=summarize(norm([row({date:'2026-01-01',result:'loss',stake:3}),row({id:'2',date:'2026-01-02'}),row({id:'3',date:'2026-01-03',result:'loss',stake:2})]));assert.equal(s.maxDrawdown,4);});
test('same-day settlement is batched, no invented intraday path',()=>{assert.equal(summarize(norm([row(),row({id:'2',result:'loss'})])).maxDrawdown,0);});
test('void, half win and half loss',()=>{assert.equal(summarize(norm([row({result:'void'}),row({id:'2',result:'half_win'}),row({id:'3',result:'half_loss'})])).profit,0);});
test('pending excluded',()=>{const d=normalizePicks([row(),row({id:'2',result:'pending'})]);assert.equal(d.pending,1);assert.equal(d.picks.length,1);});
test('duplicate id is scoped to tipster',()=>{assert.throws(()=>norm([row(),row()]));assert.equal(norm([row(),row({tipster:'B'})]).length,2);});
test('invalid records fail atomically',()=>{for(const x of [{stake:0},{stake:-1},{stake:'abc'},{odds:1},{result:'won'},{date:'2026-02-30'},{date:'yesterday'},{date:'2026-01-01T12:00:00'},{profit:2},{profit:NaN}])assert.throws(()=>norm([row(x)]));});
test('profit only is accepted, stress unavailable',()=>{const p=norm([row({result:'',profit:0.3})]);assert.equal(summarize(p).profit,.3);assert.equal(stress(p,2,2),null);});
test('slippage and commission, losses unchanged',()=>{const p=norm([row(),row({id:'2',result:'loss'})]);assert.ok(Math.abs(stress(p,10,5).profit-(-.24))<1e-10);});
test('half win stress and zero scenario identity',()=>{const p=norm([row({result:'half_win'})]);assert.equal(stress(p,0,0).profit,summarize(p).profit);assert.ok(Math.abs(stress(p,10,0).profit-.4)<1e-10);});
test('CSV quoted comma, newline, escaped quote, CRLF, BOM',()=>{assert.deepEqual(parseCSV('\uFEFFa,b\r\n"a,b","say ""hi""\nnow"\r\n'),[{a:'a,b',b:'say "hi"\nnow'}]);assert.throws(()=>parseCSV('a,a\n1,2'));assert.throws(()=>parseCSV('a,b\n1'));assert.throws(()=>parseCSV('a\n"a'));});
test('JSON envelopes and CSV entry',()=>{assert.equal(parseInput(JSON.stringify({picks:[row()]})).mode,'picks');assert.equal(parseInput('id,tipster,date,stake,odds,result\n1,A,2026-01-01,1,2,win').picks.length,1);});
test('radar preserves missing versus zero and snake_case',()=>{const d=parseInput(JSON.stringify([{slug:'a',picks:100,yield:'0',yield_3m:null}]));assert.equal(d.tipsters[0].yield,0);assert.equal(d.tipsters[0].yield3m,null);assert.throws(()=>parseInput('[{"slug":"a","picks":1,"yield":"oops"}]'));});
test('split holds whole UTC dates together',()=>{const p=norm(Array.from({length:10},(_,i)=>row({id:String(i),date:`2026-01-${String(i+1).padStart(2,'0')}`})));const s=temporalSplit(p);assert.equal(s.train.n,7);assert.equal(s.holdout.n,3);assert.equal(s.cutoff,'2026-01-08');});
test('bootstrap is deterministic and constant return stays constant',()=>{const p=norm(Array.from({length:12},(_,i)=>row({id:String(i),date:`2026-01-${String(i+1).padStart(2,'0')}`})));assert.deepEqual(dailyBootstrap(p),dailyBootstrap(p));assert.equal(dailyBootstrap(p).low,100);assert.equal(dailyBootstrap(p).high,100);});
test('overlap is exact event id not correlation',()=>{const p=norm([row({eventId:'match'}),row({tipster:'B',eventId:'match'}),row({id:'2'})]);const o=overlaps(p);assert.equal(o.shared.length,1);assert.equal(o.tagged,2);});
test('demo valid and three distinct streams',()=>{const p=norm(demoPicks());assert.equal(new Set(p.map(p=>p.tipster)).size,3);assert.ok(p.length>500);assert.ok(temporalSplit(p));});
import {evaluateMYS,mysFromPicks,normalizeMYS} from '../app/src/engine.mjs';
test('MYS inclusive thresholds exactly 100 and 11',()=>{assert.equal(evaluateMYS({picks:100,yield:11,access:'free'}).verdict,'pass');});
test('MYS independently fails sample yield paid private',()=>{for(const x of [{picks:99},{yield:10.999},{access:'paid'},{access:'private'}])assert.equal(evaluateMYS({picks:100,yield:11,access:'free',...x}).verdict,'fail');});
test('unknown access is not pass, missing yield is unknown',()=>{assert.equal(evaluateMYS({picks:100,yield:11,access:'unknown'}).verdict,'unknown');assert.equal(evaluateMYS({picks:100,yield:null,access:'free'}).verdict,'unknown');});
test('MYS never borrows category or FREE sample',()=>{const p=norm(Array.from({length:110},(_,i)=>row({id:String(i),category:i<20?'Liga A':'Liga B',visibility:i<105?'paid':'free'})));const scopes=mysFromPicks(p);assert.equal(scopes.find(x=>x.scope==='Liga A').picks,20);assert.ok(scopes.filter(x=>x.access==='free').every(x=>x.verdict==='fail'));assert.ok(scopes.filter(x=>x.access==='paid').every(x=>x.verdict==='fail'));});
test('MYS JSON import and malformed access',()=>{assert.equal(parseInput('{"scopes":[{"tipster":"A","scope":"Liga","picks":100,"yield":11,"access":"free"}]}').scopes[0].verdict,'pass');assert.throws(()=>normalizeMYS([{tipster:'A',scope:'Liga',picks:100,yield:11,access:'public'}]));});
test('category named General is not counted twice',()=>{const g=mysFromPicks(norm([row({category:'General',visibility:'free'})]));assert.equal(g.length,1);assert.equal(g[0].picks,1);});
test('MYS rejects invalid provenance dates',()=>{assert.throws(()=>normalizeMYS([{tipster:'A',scope:'Liga',picks:100,yield:11,access:'free',asOf:'2026-02-30'}]));});

test('rounded displayed yield touching11 stays pending, not source-certified',()=>{
 const base={tipster:'Fixture',scope:'Liga',picks:100,access:'free',yieldIsRounded:true,yieldDecimals:2};
 assert.equal(evaluateMYS({...base,yield:11}).verdict,'unknown');
 assert.equal(evaluateMYS({...base,yield:11.01}).verdict,'pass');
 assert.equal(evaluateMYS({...base,yield:10.99}).verdict,'fail');
 assert.equal(evaluateMYS({...base,yield:12,yieldDecimals:null}).verdict,'unknown');
 assert.equal(evaluateMYS({...base,yield:11,yieldIsRounded:false}).verdict,'pass');
 const parsed=parseInput(JSON.stringify({scopes:[{...base,yield:11}]}));
 assert.equal(parsed.scopes[0].verdict,'unknown');assert.equal(parsed.scopes[0].yieldIsRounded,true);
});

test('booleans and arrays are not numeric inputs; invalid visibility/time fails atomically',()=>{
 for(const x of [{stake:true},{stake:[1]},{visibility:'public'},{date:'2026-01-01T24:00:00Z'}])assert.throws(()=>norm([row(x)]));
 assert.throws(()=>normalizeMYS([{tipster:'A',scope:'Liga',picks:true,yield:11,access:'free'}]));
});
test('zero stress preserves supplied net profit and scenarios subtract modeled odds loss',()=>{
 const p=norm([row({profit:.99})]);assert.equal(stress(p,0,0).profit,.99);assert.ok(Math.abs(stress(p,10,0).profit-.79)<1e-10);
});
test('overflowed magnitude is rejected, not serialized as fake null metrics',()=>{assert.throws(()=>summarize(norm([row({stake:1e308,result:'loss'}),row({id:'2',stake:1e308,result:'loss'})])));});
test('importer warnings survive JSON and report roundtrip as inert text only',()=>{
 const scopes=[{tipster:'A',scope:'Liga',picks:100,yield:11,access:'free'}];
 const d=parseInput(JSON.stringify({scopes,warnings:['ALL no acredita FREE',null,12]}));assert.deepEqual(d.warnings,['ALL no acredita FREE']);
});
