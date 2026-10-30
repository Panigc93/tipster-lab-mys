// Tipster Lab: pure, network-free analysis. All returns are historical descriptions.
export const VERSION = '0.4.0';
const sum = xs => xs.reduce((a,b)=>a+b,0);
const num = x => x === null || x === undefined || String(x).trim()==='' ? NaN : Number(x);
export function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"') {cell+='"';i++;} else if(quoted || !cell) quoted=!quoted; else throw Error('Comillas no válidas en CSV'); }
    else if(c===','&&!quoted) {row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted) {if(c==='\r'&&text[i+1]==='\n')i++; row.push(cell); if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('CSV con comillas sin cerrar');
  row.push(cell);if(row.some(x=>x!==''))rows.push(row);
  if(rows.length<2)throw Error('CSV sin registros');
  const headers=rows.shift().map(x=>x.trim());
  if(new Set(headers).size!==headers.length)throw Error('Cabeceras CSV duplicadas');
  return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Fila CSV ${i+2}: número de columnas incorrecto`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
export function parseInput(text) {
  if(text.length>10_000_000)throw Error('Límite de importación: 10 MB');
  const raw=/^[\s\uFEFF]*[\[{]/.test(text)?JSON.parse(text.replace(/^\uFEFF/,'')):parseCSV(text);
  const rows=Array.isArray(raw)?raw:raw.scopes??raw.picks??raw.tipsters;
  if(!Array.isArray(rows)||!rows.length)throw Error('Se espera un array JSON, {picks: []}, {tipsters: []} o CSV');
  if(rows.length>50000)throw Error('Límite: 50.000 registros');
  if(rows.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error('Cada registro debe ser un objeto');
  if(rows.some(x=>'scope'in x||'access'in x))return {mode:'mys',scopes:normalizeMYS(rows),total:rows.length};
  return rows.some(x=>'stake'in x||'result'in x||'settledAt'in x)?normalizePicks(rows):normalizeRadar(rows);
}
function validDate(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(s))return null;
  const d=new Date(s); if(!Number.isFinite(+d))return null;
  // Check calendar day before Date can silently roll February 30 into March.
  const day=s.slice(0,10);const utc=new Date(day+'T00:00:00Z');
  if(utc.toISOString().slice(0,10)!==day)return null;
  return d.toISOString();
}
export function normalizePicks(rows){
 const issues=[], picks=[], seen=new Set();let pending=0;
 const results=new Set(['win','loss','void','half_win','half_loss','pending']);
 rows.forEach((r,i)=>{
  const at=`Fila ${i+1}`; const tipster=String(r.tipster??'').trim(); const id=String(r.id??'').trim();
  const settledAt=validDate(r.settledAt??r.date);const stake=num(r.stake),odds=num(r.odds);
  const result=String(r.result??'').toLowerCase().trim();
  if(!tipster||!id||!settledAt||!(stake>0)||!Number.isFinite(stake)){issues.push(`${at}: tipster, id, fecha ISO y stake > 0 obligatorios`);return;}
  const key=JSON.stringify([tipster,id]);if(seen.has(key)){issues.push(`${at}: id duplicado para ${tipster}`);return;}seen.add(key);
  if(result&&!results.has(result)){issues.push(`${at}: resultado no reconocido`);return;}
  if(result==='pending'){pending++;return;}
  const factors={win:1,half_win:0.5,loss:-1,half_loss:-0.5,void:0};
  let computed=null;
  if(result==='loss'||result==='half_loss'||result==='void')computed=stake*factors[result];
  if(result==='win'||result==='half_win'){
   if(!(odds>1)||!Number.isFinite(odds)){issues.push(`${at}: cuota decimal > 1 obligatoria para ganadas`);return;}
   computed=stake*(odds-1)*factors[result];
  }
  const supplied=num(r.profit); const hasProfit=r.profit!==undefined&&r.profit!==null&&String(r.profit).trim()!=='';
  if(hasProfit&&!Number.isFinite(supplied)){issues.push(`${at}: profit no válido`);return;}
  if(computed===null&&!hasProfit){issues.push(`${at}: falta profit neto o resultado liquidado`);return;}
  if(computed!==null&&hasProfit&&Math.abs(computed-supplied)>Math.max(0.02,Math.abs(computed)*0.005)){issues.push(`${at}: profit y resultado/cuota no coinciden`);return;}
  const profit=hasProfit?supplied:computed;
  if(profit < -stake-0.02){issues.push(`${at}: pérdida mayor que stake (formato no soportado)`);return;}
  if(result==='void'&&Math.abs(profit)>0.02){issues.push(`${at}: void con profit distinto de cero`);return;}
  picks.push({id,tipster,settledAt,day:settledAt.slice(0,10),stake,odds:Number.isFinite(odds)?odds:null,result:result||null,profit,eventId:r.eventId?String(r.eventId).trim():null,category:String(r.category??'Sin categoría'),visibility:String(r.visibility??'unknown')});
 });
 if(issues.length)throw Error(`${issues.length} registro(s) inválidos. Importación cancelada. ${issues.slice(0,6).join(' · ')}`);
 if(!picks.length)throw Error('No hay picks liquidados válidos');
 picks.sort((a,b)=>a.settledAt.localeCompare(b.settledAt)||a.tipster.localeCompare(b.tipster)||a.id.localeCompare(b.id));
 return {mode:'picks',picks,pending,total:rows.length};
}
export function normalizeRadar(rows){
 const tipsters=rows.map((r,i)=>{
 const name=String(r.name??r.slug??'').trim(); const picks=num(r.picks);
 if(!name||!Number.isInteger(picks)||picks<0)throw Error(`Fila ${i+1}: name/slug y picks entero >= 0 obligatorios`);
 const get=(...keys)=>{const k=keys.find(k=>r[k]!==undefined);if(!k||r[k]===null||r[k]==='')return null;const n=num(r[k]);if(!Number.isFinite(n))throw Error(`Fila ${i+1}: ${k} no válido`);return n;};
 const date=(...keys)=>{const k=keys.find(k=>r[k]);if(!k)return null;const d=validDate(r[k]);if(!d)throw Error(`Fila ${i+1}: ${k} debe ser fecha ISO`);return d;};
 return {name,slug:String(r.slug??name),picks,yield:get('yield'),yield3m:get('yield3m','yield_3m'),yield6m:get('yield6m','yield_6m'),yield12m:get('yield12m','yield_12m'),resetCount:get('resetCount','reset_count'),updatedAt:date('statsUpdatedAt','stats_updated_at','updatedAt','updated_at')};
 });
 if(new Set(tipsters.map(t=>t.slug)).size!==tipsters.length)throw Error('Slugs duplicados en radar');
 return {mode:'radar',tipsters,total:rows.length};
}
export function summarize(picks){
 const turnover=sum(picks.map(p=>p.stake)),profit=sum(picks.map(p=>p.profit));
 const daily=new Map();for(const p of picks)daily.set(p.day,(daily.get(p.day)||0)+p.profit);
 let equity=0,peak=0,maxDrawdown=0;const curve=[{x:0,label:'Inicio',value:0}];
 [...daily].sort(([a],[b])=>a.localeCompare(b)).forEach(([day,p],i)=>{equity+=p;peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak-equity);curve.push({x:i+1,label:day,value:equity});});
 const monthly=new Map();for(const p of picks){const m=p.day.slice(0,7);const a=monthly.get(m)||{month:m,profit:0,stake:0,picks:0};a.profit+=p.profit;a.stake+=p.stake;a.picks++;monthly.set(m,a);}
 const months=[...monthly.values()].sort((a,b)=>a.month.localeCompare(b.month));
 const bestMonth=months.length?Math.max(...months.map(m=>m.profit)):null;
 return {n:picks.length,turnover,profit,yield:turnover?100*profit/turnover:null,maxDrawdown,curve,months,positiveMonths:months.filter(m=>m.profit>0).length,withoutBestMonth:bestMonth===null?null:profit-bestMonth};
}
export function stress(picks,slippage=0,commission=0){
 if(!Number.isFinite(slippage)||slippage<0||slippage>30||!Number.isFinite(commission)||commission<0||commission>30)throw Error('Escenarios permitidos: 0-30%');
 if(picks.some(p=>!p.result))return null;
 return summarize(picks.map(p=>{
 let profit=p.profit;
 if(p.result==='win'||p.result==='half_win'){
  // Slippage is a relative reduction in the decimal odds, floored at 1.00.
  profit=p.stake*(Math.max(1,p.odds*(1-slippage/100))-1)*(p.result==='half_win'?0.5:1);
 }
 if(profit>0)profit*=1-commission/100;
 return {...p,profit};
 }));
}
export function temporalSplit(picks){
 const days=[...new Set(picks.map(p=>p.day))].sort();if(days.length<4)return null;
 const cutoff=days[Math.floor(days.length*0.7)];
 return {cutoff,train:summarize(picks.filter(p=>p.day<cutoff)),holdout:summarize(picks.filter(p=>p.day>=cutoff))};
}
export function dailyBootstrap(picks,iterations=400){
 const days=new Map(); for(const p of picks){const x=days.get(p.day)||[0,0];x[0]+=p.profit;x[1]+=p.stake;days.set(p.day,x);}
 const blocks=[...days.values()];if(blocks.length<10)return null;
 let seed=20261030;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const samples=[];for(let j=0;j<iterations;j++){let profit=0,stake=0;for(let i=0;i<blocks.length;i++){const b=blocks[Math.floor(rng()*blocks.length)];profit+=b[0];stake+=b[1];}samples.push(100*profit/stake);}
 samples.sort((a,b)=>a-b);return {low:samples[Math.floor(iterations*.025)],high:samples[Math.min(iterations-1,Math.floor(iterations*.975))],days:blocks.length,iterations};
}
export function overlaps(picks){
 const events=new Map();for(const p of picks)if(p.eventId){const s=events.get(p.eventId)||new Set();s.add(p.tipster);events.set(p.eventId,s);}
 return {tagged:picks.filter(p=>p.eventId).length,events:events.size,shared:[...events].filter(([,s])=>s.size>1).map(([id,s])=>({id,tipsters:[...s]}))};
}
export function demoPicks(){
 let seed=99;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const rows=[];const names=['Atlas · demo','Faro · demo','Rayo · demo'];
 for(let day=0;day<270;day++)for(let t=0;t<3;t++){
  if(rng()<.22)continue;const odds=[1.9,2.05,3.4][t];const stake=t===2?(day>200?5:1):[1,2][t];
  const chance=[.56,.52,day<190?.34:.18][t];const won=rng()<chance;
  rows.push({id:`${t}-${day}`,tipster:names[t],date:new Date(Date.UTC(2026,0,1+day)).toISOString(),stake,odds,result:won?'win':'loss',eventId:`demo-event-${day}-${t===2?1:0}`,category:['Fútbol','Tenis','Fútbol'][t],visibility:'free'});
 }
 return rows;
}
// MYS is a user's screening rule, not an assertion of a statistical edge.
export function evaluateMYS(scope){
 const sample=Number.isInteger(scope.picks)&&scope.picks>=0?scope.picks:null;
 const y=Number.isFinite(scope.yield)?scope.yield:null;
 const access=['free','paid','private','unknown'].includes(scope.access)?scope.access:'unknown';
 const m=sample===null?'unknown':sample>=100?'pass':'fail';
 const yy=y===null?'unknown':y>=11?'pass':'fail';
 const s=access==='free'?'pass':access==='unknown'?'unknown':'fail';
 const states=[m,yy,s];const verdict=states.includes('fail')?'fail':states.includes('unknown')?'unknown':'pass';
 return {...scope,picks:sample,yield:y,access,m,y:yy,s,verdict};
}
export function mysFromPicks(picks){
 const groups=new Map();
 for(const p of picks){
  // Never mix paid/unknown picks into a FREE category's sample or yield.
  for(const category of ['General',...(p.category&&p.category!=='Sin categoría'&&p.category!=='General'?[p.category]:[])]){
   const key=JSON.stringify([p.tipster,category,p.visibility]);const g=groups.get(key)||{tipster:p.tipster,scope:category,access:p.visibility,rows:[]};g.rows.push(p);groups.set(key,g);
  }
 }
 return [...groups.values()].map(g=>{const st=summarize(g.rows);return evaluateMYS({tipster:g.tipster,scope:g.scope,access:g.access,picks:st.n,yield:st.yield,source:'Importación de picks',asOf:g.rows[g.rows.length-1].settledAt});});
}
export function normalizeMYS(rows){
 return rows.map((r,i)=>{
  const tipster=String(r.tipster??r.name??r.slug??'').trim(); const scope=String(r.scope??'').trim();
  if(!tipster||!scope)throw Error(`Fila ${i+1}: tipster y scope obligatorios`);
  const picks=r.picks===null||r.picks===undefined||r.picks===''?null:num(r.picks);
  const yieldPct=r.yield===null||r.yield===undefined||r.yield===''?null:num(r.yield);
  if(picks!==null&&(!Number.isInteger(picks)||picks<0))throw Error(`Fila ${i+1}: picks no válido`);
  if(yieldPct!==null&&!Number.isFinite(yieldPct))throw Error(`Fila ${i+1}: yield no válido`);
  if(r.asOf&&!validDate(r.asOf))throw Error(`Fila ${i+1}: asOf debe ser fecha ISO`);
  if(r.access!==undefined&&!['free','paid','private','unknown'].includes(r.access))throw Error(`Fila ${i+1}: access no reconocido`);
  return evaluateMYS({tipster,scope,picks,yield:yieldPct,access:r.access??'unknown',source:String(r.source??'Importación manual'),asOf:r.asOf?validDate(r.asOf):null,url:typeof r.url==='string'&&/^https:\/\/[^/]+\.blogabet\.com\//.test(r.url)?r.url:null});
 });
}
