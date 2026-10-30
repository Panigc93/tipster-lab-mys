# Tipster Lab · MYS

Versión 0.5, 30 octubre 2026. Herramienta de investigación, sin apuestas ni trading.

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

FREE explícito se etiqueta free. PAID/PRIVATE se excluyen. ALL permanece unknown: ausencia de tabla PAID no prueba gratuidad. El exportador no resta estadísticas redondeadas ni infiere acceso de una pestaña ausente. Usa los nombres de liga tal como los muestra la tabla. Compatibilidad con el DOM real pendiente de comprobación autenticada: las pruebas usan fixtures de DOM, no una certificación en vivo.

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

La primera lectura autenticada puntual devolvió HTTP 403, pero no replicaba la llamada AJAX del repo. Se detuvo. Hay un único diagnóstico equivalente autorizado para después del intervalo comunicado de una hora; no se hacen consultas repetidas ni se considera probado que la cookie esté inválida. No hay resultados MYS reales validados ni promesa de que la cookie esté vigente. El dataset existente de 8.445 nombres/slugs no contiene picks ni yields, por lo que no se presenta como evidencia MYS.

## Hito 0.3: snapshots HTML, sin conexión

El importador estándar Python convierte tablas Statistics ya guardadas en HTML en muestras MYS con fecha y fuente. No abre páginas, no usa cookies ni ejecuta scripts del HTML.

```sh
python3 importers/stats_html.py stats-guardadas.html --tipster nombre --as-of 2026-10-30T12:00:00Z --source-url https://nombre.blogabet.com/ --out mys.json
node cli.mjs mys.json --out informe.json
python3 -m unittest discover -s tests -p 'test_*.py'
```

La fecha debe ser la de captura real, no se deduce de la fecha del archivo. FREE explícito conserva acceso free; ALL queda unknown; PAID/PRIVATE permanecen excluidos. Los números visibles pueden estar redondeados, especialmente alrededor del 11%: revisa la cifra exacta antes de una decisión. No se resta ALL-PAID con números redondeados ni se atribuye gratuidad por ausencia de pestañas. Tablas sin cargar, cabeceras no reconocidas y números ambiguos quedan advertidos o rechazados, nunca convertidos en ceros.

La compatibilidad está probada con casos sintéticos de estructura DOM, NO con un snapshot autenticado real de Blogabet. Categorías sin identificación estructural conservan el texto original; no se inventa una liga recortando nombres. La app 0.3 añade búsqueda y visualización progresiva de muestras para manejar importaciones grandes sin llenar el móvil con miles de tarjetas.

## Versión autónoma 0.4, sin instalación

Abre `web/index.html` desde tu disco en un navegador moderno. No necesita npm, servidor, acceso a cuentas ni Internet. Incluye MYS, importación JSON/CSV, búsqueda,30 muestras cada vez, exportación completa, curva de beneficio y auditoría secundaria. La política de seguridad del propio archivo bloquea conexiones de red. La app hospedada mantiene los análisis adicionales de comisiones y remuestreo.

Para regenerarla tras editar el motor: `node web/build.mjs`. Este paso no instala paquetes ni descarga código. La versión autónoma y la hospedada usan el mismo motor puro. Las etiquetas dicen "según datos aportados": importar una fuente no la certifica.

Prueba opcional de UI real: `node tests/browser.test.mjs` con Chrome instalado (`CHROME_BIN` permite elegir binario). Usa un perfil temporal, fixtures sintéticos y el archivo local; comprueba paginación30/60/65, búsqueda, descarga Blob completa aunque se filtre, reimportación, plantilla, auditoría, importación inválida, vacío al recargar y anchuras320/390/1280. Las capturas son evidencia local, no datos reales de Blogabet.

### Precisión y criterio11 %

El importador HTML y el exportador DOM marcan `yieldIsRounded: true` y `yieldDecimals` con la precisión visible. Si su intervalo de redondeo toca11 %, Y permanece pendiente en vez de aprobar una cifra ambigua. Ejemplo:11,00 % mostrado a2 decimales no demuestra que el valor exacto sea ≥11 %;11,01 % sí queda por encima bajo redondeo al más cercano. No convierte una fuente en certificada. Para un dato realmente exacto, `yieldIsRounded` puede ser false u omitirse; no lo omitas solo para forzar el filtro. Si no se conoce la precisión de un yield marcado redondeado, queda pendiente.

Los informes CLI exponen `scopes` y se pueden reimportar sin perder fuente, fecha ni marcas de redondeo. Ejecuta todas las pruebas Node con `node --test tests/engine.test.mjs tests/cli.test.mjs`, Python con `python -m unittest discover -s tests -p 'test_*.py'` y UI con `node tests/browser.test.mjs` (Chrome instalado).

### Version0.5: controles de integridad

Los avisos del importador se muestran como texto y viajan en el informe. Los registros inválidos cancelan el import completo; no se transforman en cero ni reemplazan una sesión correcta. Se rechazan visibilidades no reconocidas, booleanos/arrays usados como números, horas24:00 y sumas que desbordan el rango numérico. La prueba de cuotas0 % conserva el profit neto importado, incluidas pequeñas diferencias admitidas respecto al resultado bruto. La caída de cuota resta la pérdida modelada al profit neto, sin inventar que una comisión desapareció.

`sh tests/run.sh` ejecuta el motor, CLI y parser HTML. `MYS_BROWSER_TEST=1 sh tests/run.sh` añade Chrome real, DOM del exportador, precisión redondeada y texto adversarial. No requiere una cuenta ni hace llamadas Blogabet. No hay CI hospedada instalada todavía.

## Lotes reproducibles de snapshots

Para varios perfiles ya guardados, `importers/batch_snapshots.py` recibe un manifest explícito. No recorre carpetas indiscriminadamente ni busca credenciales. Solo admite archivos.html/.htm dentro de su carpeta, fechas de captura con zona, y un snapshot por tipster/muestra/acceso. Rechaza duplicados en vez de sumar dos veces la misma tabla. El informe conserva SHA256 y procedencia, no el HTML original. Un hash prueba qué archivo se procesó, no quién lo publicó ni si el acceso sigue vigente.

```json
{"snapshots":[{"file":"perfil.html","tipster":"nombre","asOf":"2026-10-30T12:00:00Z","url":"https://nombre.blogabet.com/"}]}
```

`sha256` opcional permite exigir el hash esperado. Ejecuta `python3 importers/batch_snapshots.py manifest.json --out lote-mys.json` y luego `node cli.mjs lote-mys.json --out informe.json`. No se escribe un resultado parcial si falla un snapshot. Usa una carpeta aislada con solo el manifest y snapshots deseados. No incluyas cookies ni HTML privado en un repo público.

Las fuentes enlazadas se restringen a perfiles HTTPS de Blogabet. Se eliminan query strings y fragmentos para no incluir tokens accidentales en exportaciones. Un enlace dentro de un import no confirma autoría. Los importadores/CLI rechazan reemplazar una salida existente: usa un nombre nuevo para conservar evidencia. Nunca subas snapshots autenticados a GitHub.

Las pruebas generativas deterministas contrastan200 historiales contra una implementación aritmética independiente de beneficio/stake/drawdown,100 historiales de escenarios y muestreos MYS por tipster/categoría/acceso. Verifican invariantes, no capacidad de predecir apuestas.

## Función0.6: comparar dos capturas

La app autónoma `web/index.html` permite importar el snapshot actual y después el anterior, ver altas/ausentes/cambios, deltas de picks y yield, transición MYS y avisos de posible reset o fecha ausente. No consulta sitios ni guarda archivos después de recargar. El informe completo conserva todas las muestras aunque la pantalla muestre solo30 diferencias. Cambiar el dataset limpia la comparación para no presentar una comparación antigua junto a otro historial.

También funciona sin interfaz: `node compare.mjs anterior.json actual.json --out comparacion.json`. Requiere muestras MYS, sin duplicados por tipster/ámbito/acceso, y rechaza capturas actuales anteriores a las previas cuando ambas tienen fecha. Un cambio FREE→PRIVATE aparece como una retirada y un alta, sin mezclar muestras. Ausencia del archivo no significa desaparición real. Caída de picks no prueba un reset. Diferencia de yield son puntos porcentuales, no el yield del periodo entre capturas: sin stakes/profits exactos no se reconstruye rendimiento incremental.

Esta función está en la app autónoma, CLI y página hospedada. La página hospedada incorpora la misma comparación tras su verificación y publicación0.6.
