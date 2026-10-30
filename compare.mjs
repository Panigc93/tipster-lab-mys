#!/usr/bin/env node
// Compare supplied MYS snapshots. Never fetches or treats differences as a new betting history.
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {parseInput,VERSION} from './app/src/engine.mjs';
import {compareSnapshots} from './app/src/compare.mjs';
export {compareSnapshots};
function main(){const [oldFile,newFile,...args]=process.argv.slice(2);if(!oldFile||!newFile)throw Error('Uso: node compare.mjs anterior.json actual.json [--out comparacion.json]');const report=compareSnapshots(parseInput(fs.readFileSync(oldFile,'utf8')),parseInput(fs.readFileSync(newFile,'utf8')));const out=args.indexOf('--out');const text=JSON.stringify(report,null,2)+'\n';if(out>=0){if(!args[out+1])throw Error('Falta ruta --out');if(fs.existsSync(args[out+1]))throw Error('La salida ya existe; elige otro nombre');fs.writeFileSync(args[out+1],text);console.log('Comparación guardada.');}else console.log(text);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)try{main();}catch(e){console.error('Error: '+e.message);process.exitCode=1;}
