#!/usr/bin/env node
import fs from 'node:fs';
import {parseInput,mysFromPicks,summarize,temporalSplit,dailyBootstrap,overlaps,evaluateMYS,VERSION} from './app/src/engine.mjs';
const args=process.argv.slice(2),file=args[0];
if(!file){console.error('Uso: node cli.mjs datos.json|csv [--out informe.json]');process.exit(1);}
try{
 const data=parseInput(fs.readFileSync(file,'utf8'));let report={version:VERSION,mode:data.mode,warnings:data.warnings,criteria:{minPicks:100,minYieldPct:11,access:'free'}};
 if(data.mode==='picks')Object.assign(report,{scopes:mysFromPicks(data.picks),audit:summarize(data.picks),split:temporalSplit(data.picks),bootstrap:dailyBootstrap(data.picks),overlap:overlaps(data.picks)});
 else if(data.mode==='mys')Object.assign(report,{scopes:data.scopes});
 else Object.assign(report,{scopes:data.tipsters.map(t=>evaluateMYS({tipster:t.name,scope:'General',picks:t.picks,yield:t.yield,access:'unknown'}))});
 const text=JSON.stringify(report,null,2);const out=args.indexOf('--out');if(out>=0){if(!args[out+1])throw Error('Falta ruta de --out');fs.writeFileSync(args[out+1],text+'\n');console.log('Informe guardado.');}else console.log(text);
}catch(e){console.error('Error: '+e.message);process.exit(1);}
