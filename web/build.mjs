// Rebuild the standalone page after editing engine.mjs. No package installation.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));const file=path.join(dir,'index.html');
const comparison=fs.readFileSync(path.join(dir,'../app/src/compare.mjs'),'utf8').split('const key=')[1];
const engine=fs.readFileSync(path.join(dir,'../app/src/engine.mjs'),'utf8').replace(/export (const|function)/g,'$1')+'\nconst key='+comparison.replace('export function','function');
let html=fs.readFileSync(file,'utf8');const start='/*ENGINE_START*/',end='/*ENGINE_END*/';
if(html.includes('/*ENGINE*/'))html=html.replace('/*ENGINE*/',start+'\n'+engine+'\n'+end);else html=html.slice(0,html.indexOf(start))+start+'\n'+engine+'\n'+end+html.slice(html.indexOf(end)+end.length);
fs.writeFileSync(file,html);console.log('Standalone HTML rebuilt.');
