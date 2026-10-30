// MYS export: reads loaded Statistics tables only. No network, cookies or storage.
(function () {
 'use strict';
 if(!/(^|\.)blogabet\.com$/.test(location.hostname))throw Error('Abre primero una página de estadísticas de Blogabet.');
 const clean=node=>{const clone=node.cloneNode(true);clone.querySelectorAll('.hidden,[hidden],[aria-hidden="true"],script,style,template').forEach(n=>n.remove());return clone.textContent.replace(/\s+/g,' ').trim();};
 const number=s=>{s=String(s).replace(/[%+\s\u00a0]/g,'').replace(/−/g,'-');if(/^[-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');else if(/^[-]?\d+,\d+$/.test(s))s=s.replace(',','.');return /^-?\d+(\.\d+)?$/.test(s)?Number(s):null;};
 const slug=location.hostname.endsWith('.blogabet.com')?location.hostname.split('.')[0]:'';
 if(!slug||slug==='www')throw Error('Abre el perfil individual de un tipster.');
 const scopes=[];const warnings=[];const seen=new Set();
 const decimals=text=>{let s=String(text).replace(/[%+\s\u00a0]/g,'');if(s.includes(',')&&!s.includes('.')&&!/^-?\d{1,3}(,\d{3})+$/.test(s))s=s.replace(',','.');return s.includes('.')?s.split('.').at(-1).length:0;};
 for(const section of ['categories','sports'])for(const type of ['free','alltime','paid','private']){
  const root=document.getElementById(`${type}-${section}-StatsTabContent`);if(!root)continue;
  const table=root.querySelector('table');if(!table)continue;
  const headers=[...table.querySelectorAll('thead th')].map(th=>clean(th).toLowerCase().replace(/[\s_]+/g,''));
  const pickCol=headers.findIndex(x=>x==='picks');const yieldCol=headers.findIndex(x=>x==='yield');
  if(pickCol<0||yieldCol<0){warnings.push(`Cabeceras no reconocidas: ${type}/${section}`);continue;}
  const access=type==='free'?'free':type==='paid'?'paid':type==='private'?'private':'unknown';
  for(const tr of table.querySelectorAll('tbody tr')){
   const cells=[...tr.querySelectorAll('td')];if(cells.length<=Math.max(pickCol,yieldCol))continue;
   const picks=number(clean(cells[pickCol]));const y=number(clean(cells[yieldCol]));
   if(!Number.isInteger(picks)||picks<0||y===null){warnings.push(`Fila omitida por números ambiguos en ${type}/${section}`);continue;}
   const sport=cells[0].querySelector('i.sport-icon')?.getAttribute('title')?.trim();
   let label=clean(cells[0]);if(!label)continue;
   // Do not halve arbitrary strings. Use structural text where present, otherwise preserve raw label.
   const leaf=[...cells[0].querySelectorAll('a,span')].filter(n=>!n.children.length&&!n.classList.contains('hidden')&&clean(n));
   const named=leaf.map(n=>clean(n));if(named.length&&new Set(named).size===1)label=named[0];
   const scope=section==='sports'?`Deporte: ${label}`:sport&&!label.startsWith(sport)?`${sport} - ${label}`:label;
   const key=JSON.stringify([scope,access]);if(seen.has(key)){warnings.push(`Muestra duplicada omitida: ${scope}/${access}`);continue;}seen.add(key);
   scopes.push({tipster:slug,scope,picks,yield:y,yieldIsRounded:true,yieldDecimals:decimals(clean(cells[yieldCol])),access,source:`Tabla cargada ${type}/${section}; yield mostrado y redondeado por Blogabet`,asOf:new Date().toISOString(),url:location.origin+location.pathname});
  }
 }
 if(!scopes.length)throw Error('No se encontraron tablas cargadas compatibles. Abre Statistics y expande Sports o Categories antes de exportar.');
 if(scopes.some(x=>x.access==='unknown'))warnings.push('ALL no demuestra que una muestra sea FREE. Su seguibilidad permanece pendiente. No se resta PAID/PRIVATE con datos redondeados.');
 const data={format:'mys-scopes-v1',scopes,warnings};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`mys-${slug}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 alert(`Exportadas ${scopes.length} muestras. ALL queda con acceso sin verificar. Importa mys-${slug}.json en Tipster Lab. No se han hecho llamadas de red.`);
})();
