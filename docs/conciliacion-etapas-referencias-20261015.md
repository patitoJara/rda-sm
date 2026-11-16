# Conciliación de etapas, cierres definitivos y referencias

Fecha: 15/10/2026. Rama: `v1.0`. Corrección semántica implementada; conciliación institucional pendiente de fuente autenticada.

## 1. Diagnóstico

El bloque inferior «Resultados de cierre» usaba `periodMovements`, que seleccionaba únicamente `history.closed`: episodios globales con `stateCode = CERRADO`. Por tanto, una etapa cerrada con resultado `REFERENCIA` cuyo episodio seguía `EN_TRAMITE` no aparecía allí. El cero de ese bloque no demostraba ausencia de trabajo de referencia del programa. La discrepancia entre la unidad de conteo y la interpretación esperada fue informada antes de modificar el cálculo.

La bandeja histórica, en cambio, consulta `getPrioritizedEpisodeStages` con `stateCode = CERRADO` y utiliza `stageStateCode`, `stageResultCode` y `closureDate`. Cuenta etapas. No corresponde reemplazar silenciosamente los cierres definitivos por su total.

## 2. Definiciones confirmadas por el responsable

- Referencia: termina una etapa de gestión del emisor, pero no termina el episodio global.
- Receptor: continúa el mismo episodio; no crea otro ingreso global por recibirlo.
- Segunda referencia: otra etapa/movimiento de gestión, conservando el identificador del episodio.
- Cierre definitivo: una terminación global por episodio, con fecha funcional propia.
- Resultados por programa: etapas finalizadas, incluyendo referencias, tratamiento, abandono y otras causales reales.

Estas definiciones están confirmadas por la instrucción del responsable. La presencia concreta de los campos y valores en respuestas de producción no se verificó en esta intervención.

## 3. Fuentes y atribución

| Medida | Unidad | Fecha | Programa |
|---|---|---|---|
| Ingreso global | `episodeId` único | `originalRequestDate` | Primera etapa única (`stageOrder = 1`) |
| Activas | Fuente operativa existente | Situación actual | Fuente operativa existente, sin cambios |
| Cierre definitivo | `episodeId` global cerrado | `episode.closureDate` | `episode.currentProgram.id` |
| Gestión finalizada | `stageId` único cerrado | `stage.closureDate` | `stage.programId` |
| Resultado de gestión | `stage.stageResultCode` | Fecha de cierre de esa etapa | Programa que finalizó la etapa |
| Referencias enviadas/recibidas | Servicio existente de referencias | Rango `from`/`to` existente | Criterio existente del servicio |

Se conservan las consultas explícitas de abiertos y cerrados, paginación completa, controles de cobertura y límites defensivos de la intervención anterior. No se agregaron endpoints ni solicitudes adicionales. No se infiere una referencia recibida desde un cierre de etapa ni se fuerza coincidencia con las referencias enviadas.

## 4. Cambios realizados

- El histórico mantiene sus colecciones de ingresos y cierres definitivos y agrega una colección separada de etapas cerradas, con `episodeId` y `stageId` para trazabilidad sin datos personales.
- Las etapas se filtran conjuntamente por año, mes y programa usando su propia fecha y programa. Se respeta además el ámbito de programas del dashboard.
- Los resultados del bloque inferior utilizan esa colección. El total se rotula «Etapas cerradas» y el título «Resultados de gestión · etapas».
- La nota aclara que tarjetas y matriz continúan mostrando cierres definitivos de episodios.
- Resultados desconocidos conservan su código y participan en total y predominancia. Si el resultado está ausente, el desglose y predominio quedan no disponibles; no se inventan ceros. Si faltan fecha funcional, programa o identificador de etapa, no se publica un total parcial de etapas.
- Un ID de etapa repetido se rechaza. Varias etapas legítimas del mismo episodio sí cuentan como distintas gestiones, nunca como ingresos o cierres globales adicionales.

Los datos sintéticos se encuentran exclusivamente en pruebas. No se modificó backend, autenticación, permisos, contratos, cierres operativos ni datos almacenados.

## 5. Conciliación de los antecedentes de PAI Adulto Magallanes

Los 132 registros históricos, 18 resultados «Referencia» en 2026 y 20 activas son antecedentes proporcionados por el responsable. No se incorporaron como constantes ni se asumió que los 132 fueran del año 2026.

No se dispuso de una respuesta autenticada ni de los identificadores de esas 18 etapas/episodios. Por ello no se declara conciliado su total, distribución mensual, programa emisor, receptor ni eventual cierre global. No se accedió a nombres, RUN ni otros datos personales para este informe.

Para cerrar la conciliación se requiere una extracción autorizada de campos mínimos: `stageId`, `episodeId`, `programId`, `stageStateCode`, `stageResultCode`, `stage.closureDate`, `episode.stateCode`, `episode.closureDate` y programa final; además, identificadores/fechas/programas de movimientos de referencia si esa fuente los expone. No se necesita incluir identidad personal del demandante. Comparar las mismas fechas y filtros y explicar diferencias entre los tres universos; el agregado de referencias por sí solo no permite conciliación uno a uno.

## 6. Pruebas

`node --test src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs`: **21 aprobadas, 0 fallidas**, conservando las 15 anteriores.

Cobertura: episodio referido aún abierto; referencia en el emisor; recepción sin nuevo ingreso; segunda referencia; cierre global posterior único; fechas y filtros combinados; definición intacta de ingresos/cierres de la matriz; categorías desconocidas y ausentes; fechas faltantes sin sustitución técnica; duplicados; consulta completa, paginación y estados explícitos. El escenario de dos referencias y tratamiento final produce tres etapas, un ingreso y un cierre definitivo.

Estas son pruebas automatizadas con datos sintéticos, no evidencia de cifras institucionales.

## 7. Compilación y revisión

`npx tsc --noEmit -p tsconfig.app.json`: correcto. Compilación Angular registrada en `.local-backups/conciliacion-etapas-20261015/build.log`. `git diff --check`: sin errores. No se realizó validación funcional autenticada en localhost ni una nueva comparación visual renderizada; no se declara completada esa comprobación.

## 8. Integridad visual

Se utilizó exclusivamente la excepción autorizada para cambios mínimos de etiquetas y vinculación de valores. No se alteró estructura, CSS ni formato de impresión.

- SCSS y `inicio.component.ts` (incluidas dimensiones): SHA-256 idénticos antes/después.
- HTML: su hash completo cambia necesariamente por tres sustituciones del bloque inferior: título, etiqueta/vinculación del total y nota semántica. Una comparación exacta demuestra que NO existen otros cambios de contenido en el HTML.
- SHA-256 del HTML normalizado esperado tras esas sustituciones: `2094c665c8e7feab54f72c649fb39f6a9ccd985ac96fdcb6a3e50e8b8b8e27f1`; coincide con el HTML obtenido.
- Código de las seis tarjetas, cálculo de la matriz y función `printAnalysis`: idénticos respecto del respaldo. La impresión refleja los nuevos textos y cifras del mismo bloque sin cambiar su formato.
- Evidencia reproducible: `.local-backups/conciliacion-etapas-20261015/visual-verification.json` y `visual-hashes.json`.

Esto acredita integridad del código visual salvo las sustituciones semánticas autorizadas; no sustituye una medición de renderizado.

## 9. Archivos y respaldos

Modificados en esta intervención:

- `src/app/views/inicio/program-analysis-dialog/program-analysis-data.ts`.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.ts`.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.html`: solo tres sustituciones autorizadas.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs`.
- `harness/06-modulos/inicio/harness.md`: regla confirmada y distinción de unidades.
- Este informe nuevo.

Respaldos previos verificados por hash en `.local-backups/conciliacion-etapas-20261015/`. Se leyeron AGENTS, índice, global, Inicio, API, negocio, UI y seguridad. Se mantiene «sin quit».

## 10. Git y pendientes

Se preservaron cambios anteriores. Inventario inicial en `git-status-inicial.txt` dentro del respaldo. Sin git add, commit, merge, push ni despliegue.

Pendiente: consultar backend autenticado, conciliar las 18 etapas mediante sus IDs y verificar sus fechas/programas frente a referencias enviadas/recibidas y eventuales cierres globales. Si el contrato no entrega esos detalles, documentar exactamente qué falta antes de solicitar cambios adicionales. No se requieren cambios estructurales visuales para la distinción implementada.
