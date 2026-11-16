# Corrección de datos del Control Ejecutivo — 15/10/2026

Estado: corrección de consultas implementada y probada; contraste con backend y registros reales pendiente. Diseño aprobado preservado.

## Hallazgo y alcance de la evidencia

La implementación anterior consultaba `getPrioritizedEpisodes` sin `stateCode` y trataba la respuesta como un universo completo. Después contaba cierres solamente entre esos episodios mediante `episode.stateCode === 'CERRADO'`. Las etapas consultadas se usaban para atribuir ingresos, pero no incorporaban episodios ausentes del primer listado.

Por tanto, si el listado sin estado devuelve solo activos, el tablero excluye todos los episodios cerrados tanto de ingresos como de cierres. Esto reproduce exactamente el patrón comunicado: activas e ingresadas iguales y cero cerradas. Es un defecto confirmado de cobertura en la estrategia de consulta; el valor por defecto concreto del backend desplegado NO se ha confirmado en esta intervención.

La bandeja existente utiliza una fuente distinta: `getPrioritizedEpisodeStages({stateCode: 'CERRADO', ...})`. Mapea `stageStateCode`, `stageResultCode` y `closureDate`. Sus métricas cuentan `totalElements` de etapas. Por eso sus registros cerrados no prueban por sí solos cuántos episodios están definitivamente cerrados: algunas etapas corresponden a referencias de episodios que continúan activos.

No se cambió arbitrariamente `CERRADO` por otro estado. `CERRADO` y `EN_TRAMITE` son los valores empleados por las bandejas actuales. Falta verificar sus valores efectivamente devueltos por el backend; el nuevo cargador rechaza respuestas que no correspondan al filtro solicitado.

## Corrección realizada

1. Consultas explícitas de episodios abiertos y cerrados, con todas las páginas de cada estado.
2. Consultas explícitas de etapas abiertas y cerradas para disponer también de la primera etapa de episodios referidos o terminados.
3. Unión de episodios antes de calcular ingresos: un episodio cerrado sigue contando en el año de `originalRequestDate`.
4. Conservación del conteo único por `episodeId`; duplicados entre páginas o estados invalidan el histórico, en lugar de inflar resultados o elegir arbitrariamente una versión.
5. Verificación de que todo episodio mencionado por una etapa esté presente en el listado de episodios. Una fuente de episodios que omita los de etapas cerradas deja de producir un falso cero.
6. Conservación de las validaciones de fechas, paginación completa, total estable y límites de consulta. El estado de paginación ahora se reinicia por suscripción.

No se modificaron el endpoint, contrato, backend, datos almacenados ni reglas operativas.

## Criterios conservados

| Indicador | Fuente y criterio |
|---|---|
| Ingresadas | Episodios abiertos y cerrados únicos; mes/año de `originalRequestDate`; programa de primera etapa única (`stageOrder = 1`). |
| Cerradas | Episodios con `stateCode = CERRADO`; fecha funcional `closureDate`; programa `currentProgram.id`. |
| Referencias | Una etapa cerrada por referencia no suma un cierre final cuando el episodio continúa `EN_TRAMITE`. |
| Datos incompletos | Sin fecha funcional o atribución única, el total afectado no se considera completo. No se sustituye por fecha técnica ni por una cifra fija. |

El DTO de episodios declara `closureDate`, pero no se ha comprobado su presencia efectiva para episodios cerrados en una respuesta real. No se usó `closedAt`, `updatedAt` ni `createdAt` como sustituto. Si el backend no entrega episodios cerrados mediante el filtro explícito, la validación de cobertura puede detectar episodios presentes en las etapas pero ausentes del listado; no hay autorización para cambiar el backend ni para convertir esas etapas directamente en cierres de episodios.

## Verificaciones obligatorias: resultado

| Verificación | Resultado |
|---|---|
| Obtención de cerradas en la bandeja | Confirmada en `InicioComponent.loadEpisodes` e `InicioClosedMetricsService`: etapas, filtro `CERRADO`. |
| Estados reales del backend | Pendiente. Solo se comprobaron los valores utilizados por el frontend. Se solicitó ubicación del backend vigente. |
| Comparación `stateCode = CERRADO` | Se conserva; se añadió validación explícita de respuesta. No se inventaron equivalencias. |
| Fecha funcional | Código de bandeja y DTO utilizan `closureDate`; falta contrastar valores reales. |
| Presencia de `closureDate` en respuestas | Pendiente de respuesta autenticada o evidencia suministrada. |
| Paginación y filtros | Comprobados en servicio Angular y pruebas del cargador, incluyendo múltiples páginas y filtros ignorados. Semántica de backend pendiente. |
| Abiertos y cerrados | Ahora se solicitan explícitamente por separado. La fuente ya no depende del filtro implícito. |
| Ingresos de episodios luego cerrados | Incluidos y comprobados con regresión automatizada. |
| Atribución entre programas | Se conserva programa inicial para ingreso y final para cierre; probado con referencia. Validación institucional pendiente. |
| Comparación de registros identificables | No realizada: no se obtuvieron respuestas de la API ni registros reales de las bandejas en esta intervención. |

## Cifras de 2026

No se certifican cifras nuevas. Los valores 56 activas, 56 ingresadas y 0 cerradas son los informados por el responsable, no una extracción verificada durante esta corrección. No hay base suficiente para determinar todavía cuántos cierres finales únicos corresponden a 2026 ni qué identificadores reales fueron omitidos.

Los registros potencialmente omitidos son los episodios cerrados no devueltos por la consulta sin estado; una etapa histórica aislada no basta para clasificarlos como episodios definitivamente cerrados. Tampoco se puede deducir el total de ingresos sumando 56 a todos los registros de la bandeja de etapas cerradas.

## Pruebas y compilación

- `node --test src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs`: 15 pruebas aprobadas, 0 fallidas.
- Regresión con fuente simulada cuyo filtro omitido devuelve solo activos: recupera ingresos abiertos y cerrados; un solo cierre pese a dos etapas cerradas del mismo episodio.
- Referencia con episodio todavía activo: un ingreso en programa inicial y ningún cierre final.
- Respuesta que ignora estado, etapas cuyos episodios faltan, duplicados, paginación parcial/cambiante/repetida, fechas ausentes y calendario: comprobados sin datos reales de pacientes.
- `npx tsc --noEmit -p tsconfig.app.json`: sin errores.
- `npx ng build`: correcto. Registro en `.local-backups/correccion-datos-control-ejecutivo-20261015/build.log`.
- No se realizó comprobación autenticada en localhost ni validación de cifras reales. No se alteró ni se repitió el diseño visual aprobado.

## Preservación y archivos

Rama `v1.0`; cambios de intervenciones anteriores preservados. Respaldos previos con hashes verificados en `.local-backups/correccion-datos-control-ejecutivo-20261015/`.

Archivos de código modificados en esta corrección:

- `src/app/views/inicio/program-analysis-dialog/program-analysis-data.ts`.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.ts`: únicamente integración del nuevo cargador.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs`.

Documentación: ficha `harness/06-modulos/inicio/harness.md` actualizada y este informe añadido. Leídos arneses global, Inicio, API, negocio y seguridad. Se mantiene «sin quit».

Los hashes SHA-256 del HTML, SCSS y `inicio.component.ts` permanecen iguales a los del inicio de esta corrección. No se modificaron tarjetas, tablas, colores, distribución, dimensiones ni impresión.

No se realizó git add, commit, merge, push ni despliegue.

## Pendiente para cierre funcional

Contrastar las cuatro consultas con el backend vigente y una sesión autorizada: estados efectivamente devueltos, número total de páginas, IDs de episodios, `originalRequestDate`, `closureDate`, programa inicial/final y etapas de referencia. Comparar episodios identificables de la bandeja, distinguiendo cierre de etapa de cierre final. Si el endpoint de episodios no permite recuperar los cerrados, documentar esa limitación real antes de elegir otra fuente. La implementación no se declara validada con datos institucionales hasta realizar ese contraste.
