#!/usr/bin/env node
// Compare supplied MYS snapshots. Never fetches or treats differences as a new betting history.
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {parseInput,VERSION} from './app/src/engine.mjs';
const key=s=>JSON.stringify([s.tipster,s.scope,s.access]);
function index(data,label){
 if(data.mode!=='mys')throw Error(`${label}: solo snapshots de muestras MYS; exporta scopes primero`);
 const map=new Map();for(const s of data.scopes){const k=key(s);if(map.has(k))throw Error(`${label}: muestra duplicada ${s.tipster}/${s.scope}/${s.access}`);map.set(k,s);}return map;
}
export function compareSnapshots(before,after){
 const a=index(before,'Anterior'),b=index(after,'Actual'),changes=[];
 for(const [k,s] of b){const old=a.get(k);if(!old){changes.push({kind:'added',identity:{tipster:s.tipster,scope:s.scope,access:s.access},before:null,after:s,cautions:['Muestra nueva en el archivo; no prueba que sea un tipster nuevo ni una mejora.']});continue;}
  if(old.asOf&&s.asOf&&s.asOf<old.asOf)throw Error(`Fecha actual anterior a la previa: ${s.tipster}/${s.scope}`);
  const deltaPicks=old.picks===null||s.picks===null?null:s.picks-old.picks;
  const deltaYieldPp=old.yield===null||s.yield===null?null:s.yield-old.yield;
  const cautions=[];if(deltaPicks!==null&&deltaPicks<0)cautions.push('El recuento bajó: posible reset, cambio de ventana o corrección. No inferir causa.');
  if(!old.asOf||!s.asOf)cautions.push('Falta fecha en al menos una captura: orden temporal no comprobado.');
  if(old.yieldIsRounded||s.yieldIsRounded)cautions.push('Al menos un yield está redondeado: el cambio mostrado no es exacto.');
  if(old.url&&s.url&&old.url!==s.url)cautions.push('Cambió el enlace de evidencia.');
  const changed=['picks','yield','verdict','source','asOf','url','yieldIsRounded','yieldDecimals'].some(f=>old[f]!==s[f]);
  changes.push({kind:changed?'changed':'unchanged',identity:{tipster:s.tipster,scope:s.scope,access:s.access},before:old,after:s,deltaPicks,deltaYieldPp,transition:old.verdict+' -> '+s.verdict,cautions});
 }
 for(const [k,s] of a)if(!b.has(k))changes.push({kind:'removed',identity:{tipster:s.tipster,scope:s.scope,access:s.access},before:s,after:null,cautions:['Ausente del archivo actual; no prueba cierre, pérdida de acceso ni que deba descartarse.']});
 const counts={added:0,removed:0,changed:0,unchanged:0};for(const c of changes)counts[c.kind]++;
 return {version:VERSION,kind:'mys-snapshot-comparison',counts,changes,caveats:['Solo compara archivos aportados, no certifica las fuentes.','No mezcla identidades ni FREE/PAID/PRIVATE/unknown: un cambio de acceso aparece como retirada y alta.','Delta de yield en puntos porcentuales, no rendimiento del periodo entre capturas.','No se puede reconstruir el yield incremental con picks y yield agregados sin stakes/profits exactos.','No ofrece recomendaciones ni predice beneficios.']};
}
function main(){const [oldFile,newFile,...args]=process.argv.slice(2);if(!oldFile||!newFile)throw Error('Uso: node compare.mjs anterior.json actual.json [--out comparacion.json]');const report=compareSnapshots(parseInput(fs.readFileSync(oldFile,'utf8')),parseInput(fs.readFileSync(newFile,'utf8')));const out=args.indexOf('--out');const text=JSON.stringify(report,null,2)+'\n';if(out>=0){if(!args[out+1])throw Error('Falta ruta --out');if(fs.existsSync(args[out+1]))throw Error('La salida ya existe; elige otro nombre');fs.writeFileSync(args[out+1],text);console.log('Comparación guardada.');}else console.log(text);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)try{main();}catch(e){console.error('Error: '+e.message);process.exitCode=1;}
