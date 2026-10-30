#!/usr/bin/env node
// Uso: node tools-funnel.mjs export.csv --now 2026-10-30T14:20:00Z [--days 90]
import fs from 'node:fs';import {parseCsv,activityFunnel} from './app/src/funnel.mjs';
const a=process.argv.slice(2);const f=a[0],i=a.indexOf('--now'),d=a.indexOf('--days');
if(!f||i<0||!a[i+1]){console.error('Uso: node tools-funnel.mjs export.csv --now ISO [--days N]');process.exit(1);}
try{const r=activityFunnel(parseCsv(fs.readFileSync(f,'utf8')),{now:a[i+1],days:d>=0?Number(a[d+1]):90});delete r.slugsActivos;console.log(JSON.stringify(r,null,2));}catch(e){console.error('Error: '+e.message);process.exit(1);}
