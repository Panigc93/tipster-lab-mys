// Auditoría de calidad de agregados (modo radar). No certifica acceso gratuito/público ni ventaja futura.
const DAY=864e5;
export const QUALITY_RULES={minRecentPicks6m:30,staleLastPickDays:90,staleStatsDays:7,manyResets:10,picksPerResetMin:20,lowVerifiedPct:50};
export function qualityAudit(tipsters,{now,rules={}}={}){
 if(!now)throw Error('qualityAudit requiere now (ISO) para ser reproducible');
 const R={...QUALITY_RULES,...rules},t0=Date.parse(now);if(!Number.isFinite(t0))throw Error('now no válido');
 const days=d=>d?Math.floor((t0-Date.parse(d))/DAY):null;
 return tipsters.map(t=>{
  const flags=[],age=days(t.lastPickAt),statsAge=days(t.updatedAt);
  if(t.lastPickAt===null)flags.push('sin_ultimo_pick');else if(age>R.staleLastPickDays)flags.push('inactivo');
  if(statsAge!==null&&statsAge>R.staleStatsDays)flags.push('estadisticas_antiguas');
  if(t.resetCount===null)flags.push('resets_desconocidos');
  else if(t.resetCount>0){flags.push('con_resets');
   if(t.resetCount>=R.manyResets||t.picks/(t.resetCount+1)<R.picksPerResetMin)flags.push('resets_frecuentes');}
  if(t.yield6m===null)flags.push('sin_yield_6m');
  else if(t.picks6mAvg===null||t.picks6mAvg*6<R.minRecentPicks6m)flags.push('muestra_reciente_insuficiente');
  if(t.yield3m!==null&&t.yield3m<0)flags.push('3m_negativo');
  if(t.yield6m!==null&&t.yield6m<0)flags.push('6m_negativo');
  if(t.verifiedPct!==null&&t.verifiedPct<R.lowVerifiedPct)flags.push('verificacion_baja');
  flags.push('seguibilidad_no_comprobada'); // el agregado nunca prueba free/público
  return {slug:t.slug,flags,lastPickAgeDays:age,statsAgeDays:statsAge};
 });
}
export function qualitySummary(results){const c={};for(const r of results)for(const f of r.flags)c[f]=(c[f]||0)+1;return {total:results.length,flags:c};}
