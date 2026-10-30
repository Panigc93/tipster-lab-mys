// Deterministic generated cases and an independent arithmetic oracle.
import test from 'node:test';import assert from 'node:assert/strict';import {normalizePicks,summarize,stress,mysFromPicks} from '../app/src/engine.mjs';
let seed=1029;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function records(n){return Array.from({length:n},(_,i)=>({id:String(i),tipster:'Fixture '+(i%3),date:`2026-02-${String(1+Math.floor(rng()*28)).padStart(2,'0')}`,stake:1+Math.floor(rng()*9),odds:1.01+Math.floor(rng()*500)/100,result:['win','loss','half_win','half_loss','void'][Math.floor(rng()*5)],visibility:['free','paid','private','unknown'][i%4],category:'Liga '+i%5}));}
function oracle(rows){let stake=0,profit=0;const daily={};for(const r of rows){stake+=r.stake;profit+=r.profit;daily[r.day]=(daily[r.day]??0)+r.profit;}let equity=0,peak=0,dd=0;for(const day of Object.keys(daily).sort()){equity+=daily[day];if(equity>peak)peak=equity;if(peak-equity>dd)dd=peak-equity;}return {stake,profit,yield:100*profit/stake,dd};}
test('200 generated histories agree with independent stake/profit/daily-drawdown oracle',()=>{
 for(let i=0;i<200;i++){const p=normalizePicks(records(20+Math.floor(rng()*100))).picks,s=summarize(p),o=oracle(p);close(s.turnover,o.stake);close(s.profit,o.profit);close(s.yield,o.yield);close(s.maxDrawdown,o.dd);assert.ok(s.maxDrawdown>=0);close(s.curve.at(-1).value,s.profit);const reversed=summarize([...p].reverse());close(reversed.yield,s.yield);close(reversed.maxDrawdown,s.maxDrawdown);}
});
test('100 generated histories preserve0% scenario, never improve with worse odds or higher commission',()=>{
 for(let i=0;i<100;i++){const p=normalizePicks(records(100)).picks;close(stress(p,0,0).profit,summarize(p).profit);let last=Infinity;for(const slip of [0,3,8,15,30]){const s=stress(p,slip,0);assert.ok(s.profit<=last+1e-8);last=s.profit;}assert.ok(stress(p,3,10).profit<=stress(p,3,0).profit+1e-8);}
});
test('generated MYS scopes exactly match their own tipster/category/access sample, never ALL borrowing',()=>{
 const p=normalizePicks(records(1500)).picks;for(const scope of mysFromPicks(p)){const sample=p.filter(x=>x.tipster===scope.tipster&&x.visibility===scope.access&&(scope.scope==='General'||x.category===scope.scope));assert.equal(scope.picks,sample.length);close(scope.yield,oracle(sample).yield);if(scope.access!=='free')assert.notEqual(scope.verdict,'pass');}
});
test('split/recombined data preserves totals, constant stake scaling preserves yield and scales drawdown',()=>{
 const p=normalizePicks(records(200)).picks,s=summarize(p),a=summarize(p.slice(0,80)),b=summarize(p.slice(80));close(a.profit+b.profit,s.profit);close(a.turnover+b.turnover,s.turnover);const scaled=summarize(p.map(x=>({...x,stake:x.stake*7,profit:x.profit*7})));close(scaled.yield,s.yield);close(scaled.maxDrawdown,7*s.maxDrawdown);
});
