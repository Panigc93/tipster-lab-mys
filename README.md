# Tipster Lab · MYS

Versión 0.2, 30 octubre 2026. Herramienta de investigación, sin apuestas ni trading.

## Método principal

MYS es el filtro definido por Juan:
- Muestra: al menos 100 picks de una misma muestra general, categoría o liga.
- Yield: al menos 11% en esa misma muestra. Con picks individuales se usa beneficio neto / stake total.
- Seguibilidad: la misma muestra debe ser gratuita y pública. Pago/privado no cumple. Acceso desconocido queda pendiente.

Un filtro histórico no demuestra ventaja futura. No se mezclan picks generales con muestras de liga ni estadísticas ALL con FREE. El análisis conserva datos ausentes como desconocidos.

## Uso

Abre la app entregada en la conversación. Empieza vacía, nunca con resultados ficticios presentados como reales. Importa JSON/CSV o pega los registros. La demo es opcional. Los registros permanecen solo en memoria de esa sesión; no se suben ni se guardan al recargar. Exportar descarga un archivo en tu dispositivo.

### Formato MYS

```json
{"scopes":[{"tipster":"nombre","scope":"Football - Premier League","picks":100,"yield":11,"access":"free","source":"tabla FREE comprobada","asOf":"2026-10-30T12:00:00Z"}]}
```

`access`: `free`, `paid`, `private`, `unknown`. `picks` e `yield` pueden ser null. Cada registro debe corresponder a una muestra coherente. Las fuentes importadas son declaraciones del archivo, no certificaciones automáticas.

### Formato de picks

```json
[{"id":"1","tipster":"nombre","date":"2026-01-01","stake":1,"odds":2,"result":"win","category":"Football - Premier League","visibility":"free","eventId":"partido-1"}]
```

`date` o `settledAt`: fecha ISO o timestamp con zona. `stake` positivo. `result`: win/loss/void/half_win/half_loss/pending. Alternativamente `profit` neto, pero sin result no se pueden simular cuotas. Identificador único por tipster. CSV con cabecera, comas y punto decimal. Importación atómica: ningún error se omite silenciosamente. Máximo 10MB/50.000 registros.

### Agregados del clone-filter

Array de objetos con name/slug, picks, yield y opcionalmente yield3m, yield6m, yield12m, resetCount, statsUpdatedAt; admite snake_case. Como este esquema no acredita acceso público/gratuito, MYS mantiene S pendiente. No se inventan categorías, drawdown ni correlaciones.

## Exportador de tablas cargadas

`collector/mys-export.js` y `mys-export-bookmarklet.txt` leen solo tablas Statistics que YA estén cargadas en el perfil del tipster. No hacen fetch, no leen cookies ni guardan datos. Abre Statistics y expande Categories o Sports. Instala el contenido de bookmarklet como URL de un marcador, ejecútalo e importa el JSON descargado.

FREE explícito se etiqueta free. PAID/PRIVATE se excluyen. ALL permanece unknown: ausencia de tabla PAID no prueba gratuidad. El exportador no resta estadísticas redondeadas ni infiere acceso de una pestaña ausente. Usa los nombres de liga tal como los muestra la tabla. Compatibilidad con el DOM real pendiente de comprobación autenticada: hay pruebas de formato, pero no certificación en vivo.

## Auditoría secundaria

- Yield ponderado por stake, no por número de picks.
- Drawdown de cierres diarios UTC desde capital P&L inicial cero. Puede ocultar drawdown intradía y no es drawdown porcentual de bankroll.
- Sensibilidad a reducción relativa de cuotas decimales y comisión por pick ganador. No replica comisión neta por mercado, límites, latencia ni suscripciones.
- Separación temporal por días activos, 70/30. Diagnóstico retrospectivo, no validación prospectiva.
- Banda percentil por remuestreo de días: asume intercambiabilidad entre días. No cubre dependencia temporal entre días ni sesgos de selección.
- Solapamiento por eventId exacto: no es correlación, ni prueba que los tipsters se copien.

## Pruebas y estructura

Requiere Node 18+ para el motor, sin dependencias:

```sh
node --test tests/engine.test.mjs
```

`app/src/engine.mjs` es el motor puro y reutilizable. `App.tsx` es la interfaz React. El código TSX corresponde a la app hospedada; no es un proyecto npm autónomo listo para arrancar. El motor, pruebas, muestras y CLI sí lo son.

```sh
node cli.mjs archivo.json
node cli.mjs archivo.csv --out informe.json
```

No se incluye ninguna cookie, token, .env ni conexión de producción. No se modificó ningún repo existente. Código publicado en https://github.com/Panigc93/tipster-lab-mys. Página pública: https://files.instinct.com/iqr7qzwv2s4p-tipster-lab. Un primer push fue rechazado; un token de reemplazo permitió la publicación.

## Origen del diseño

Código existente inspeccionado: https://github.com/Panigc93/tipster-analyzer y https://github.com/Panigc93/blogabet-clone-filter; módulos tipster-stats y tipster-archive de blogabet-scripts (privado). Este trabajo no duplica el buscador ni el portfolio builder: hace MYS explícito y añade auditoría de riesgo con limitaciones visibles.

## Pendiente real

La lectura autenticada puntual devolvió HTTP 403. Se detuvo sin reintentos ni rutas alternativas. No hay resultados MYS reales validados ni promesa de que la cookie esté vigente. El dataset existente de 8.445 nombres/slugs no contiene picks ni yields, por lo que no se presenta como evidencia MYS.

## Hito 0.3: snapshots HTML, sin conexión

El importador estándar Python convierte tablas Statistics ya guardadas en HTML en muestras MYS con fecha y fuente. No abre páginas, no usa cookies ni ejecuta scripts del HTML.

```sh
python3 importers/stats_html.py stats-guardadas.html --tipster nombre --as-of 2026-10-30T12:00:00Z --source-url https://nombre.blogabet.com/ --out mys.json
node cli.mjs mys.json --out informe.json
python3 -m unittest discover -s tests -p 'test_*.py'
```

La fecha debe ser la de captura real, no se deduce de la fecha del archivo. FREE explícito conserva acceso free; ALL queda unknown; PAID/PRIVATE permanecen excluidos. Los números visibles pueden estar redondeados, especialmente alrededor del 11%: revisa la cifra exacta antes de una decisión. No se resta ALL-PAID con números redondeados ni se atribuye gratuidad por ausencia de pestañas. Tablas sin cargar, cabeceras no reconocidas y números ambiguos quedan advertidos o rechazados, nunca convertidos en ceros.

La compatibilidad está probada con 15 casos sintéticos de estructura DOM, NO con un snapshot autenticado real de Blogabet. Categorías sin identificación estructural conservan el texto original; no se inventa una liga recortando nombres. La app 0.3 añade búsqueda y visualización progresiva de muestras para manejar importaciones grandes sin llenar el móvil con miles de tarjetas.
