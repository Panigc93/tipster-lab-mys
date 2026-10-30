// Embudo de actividad sobre un export CSV de agregados. Distingue "sin fecha" (desconocido) de "antiguo" (fecha conocida > N días).
export function parseCsv(text){
 const rows=[];let row=[],f='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(f);f='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);f='';if(row.length>1||row[0]!=='')rows.push(row);row=[];}
  else f+=c;}
 if(f!==''||row.length){row.push(f);rows.push(row);}
 const h=rows[0];return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));
}
function ts(s){if(!s)return null;const m=/^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d)(\.\d+)?(Z|[+-]\d\d(?::?\d\d)?)$/.exec(s.trim());if(!m)throw Error(`last_pick_at no válido: ${s}`);
 const z=m[4]==='Z'?'Z':m[4].length===3?m[4]+':00':m[4].length===5?m[4].slice(0,3)+':'+m[4].slice(3):m[4];const t=Date.parse(`${m[1]}T${m[2]}${(m[3]||'').slice(0,4)}${z}`);if(!Number.isFinite(t))throw Error(`last_pick_at no válido: ${s}`);return t;}
export function activityFunnel(rows,{now,days=90}){
 const t0=Date.parse(now);if(!Number.isFinite(t0))throw Error('now no válido');
 const out={total:rows.length,activos:0,sin_fecha:0,antiguos:0,fecha_futura:0,slugsActivos:[]};
 for(const r of rows){const t=ts(r.last_pick_at);
  if(t===null)out.sin_fecha++;else if(t>t0)out.fecha_futura++;else if((t0-t)/864e5>days)out.antiguos++;else{out.activos++;out.slugsActivos.push(r.slug);}}
 return out;
}
