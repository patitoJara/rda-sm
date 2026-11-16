# Control ejecutivo de demanda — informe de implementación local

Fecha: 15 de octubre de 2026. Estado: implementación local compilada; aceptación funcional y visual pendiente. No se declara completamente terminada.

## 1. Rama y estado inicial

Rama `v1.0`. Existía una modificación en `src/app/app.routes.ts` y numerosos archivos sin seguimiento (respaldos, `docs/`, `.local-backups/`, `ui-lab/`). Se preservaron. Inventario completo en `.local-backups/control-ejecutivo-20261015/git-status-inicial.txt`.

## 2. Arnés aplicado

Leídos `AGENTS.md`, `harness/00-index.md`, global, módulos, UI, API, negocio, seguridad y estado. No existía ficha específica de Inicio. Se añadió una ficha breve en `harness/06-modulos/inicio/harness.md` para conservar las restricciones de interpretación temporal y pendientes. Se confirmó y visualizó la referencia `docs/referencias-ui/panel_de_control_ejecutivo_de_demanda.png` antes de modificar código. Se mantuvo «sin quit».

## 3. Respaldo

Los tres archivos originales del diálogo y `inicio.component.ts` están en `.local-backups/control-ejecutivo-20261015/`. Cada copia se verificó mediante comparación de hash SHA-256 antes de editar. Los archivos nuevos no sustituyen archivos existentes.

## 4. Archivos revisados

- TS, HTML y SCSS originales del diálogo y apertura desde Inicio.
- `src/app/core/services/demand.service.ts` y `src/app/core/models/demand-priority.models.ts`.
- Servicio legado `src/app/services/demand.service.ts` (no se usa como fuente del tablero).
- Servicios de métricas activas/cerradas de Inicio y utilidades de métricas cerradas y filtros.
- Catálogo y contexto de programas utilizados en Inicio; referencias de fechas y ordenación.
- `package.json`, `angular.json`, arneses y referencia visual.

## 5. Archivos modificados o añadidos

- `src/app/views/inicio/inicio.component.ts`: dimensiones del MatDialog.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.ts`: filtros, consultas, agregaciones e impresión.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.html`: tablero integral.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.scss`: distribución compacta y responsive.
- Nuevos `program-analysis-data.ts` y `program-analysis-data.test.cjs` en el mismo directorio.
- Nueva ficha de arnés de Inicio y este informe.

No se modificaron contratos API, endpoints, servicios operativos, autenticación, permisos ni base de datos.

## 6. Funcionalidades implementadas

Encabezado turquesa, seis tarjetas, año inicial 2026, todos los meses/programas, restablecimiento, selección desde tabla/matriz, doce meses permanentes y meses futuros identificados. Filtros aplicados a movimientos; fotografía actual identificada con fecha de consulta. Supervisión y recomendaciones conservadas, con detalles desplegables para severidad, pendientes, alertas, hitos y razones. Secciones de resultados y referencias, reintento general y estados de carga/error/no disponibilidad. Impresión horizontal con logotipo, fecha de emisión, filtros, tablas y detalles desplegados.

## 7. Fuentes reutilizadas

`getSupervisorProgramsDashboard`, `getSupervisorProgramsReferences(from, to)`, `getPrioritizedEpisodes`, `getPrioritizedEpisodeStages` e `InicioActiveMetricsService`. Todas las lecturas siguen los servicios existentes y la autorización del backend. No se incorporaron dependencias ni datos ficticios en producción.

Los históricos recorren todas las páginas, con límite defensivo de 10.000 registros/100 páginas por listado, validación de secuencia y total estable. No existe filtro de fecha en el contrato de listados; superar el límite deja el histórico no disponible. Los filtros temporales posteriores trabajan localmente; las referencias vuelven a consultar su rango. Las métricas activas solo se recargan al cambiar programa o actualizar.

## 8. Indicadores implementados y comprobación disponible

- Fotografía actual: activas, rojos, alertas, pendientes, prioridad y recomendaciones del dashboard; lista de espera y promedios de la fuente activa existente.
- Movimientos: ingresos, cierres únicos, actividad por programa, matriz anual y resultados, condicionados a histórico completo y atribución verificable.
- Referencias: recibidas, enviadas, pendientes, balance, promedio previo y motivos del rango solicitado. Una fila de referencias ausente no se publica como cero.

La implementación de estos indicadores compila. Su operación contra una sesión real NO pudo comprobarse en esta intervención: no se declara validación de cifras institucionales.

## 9. Limitaciones de datos

- Sin movimiento reciente: `—`; no existe una ventana ni conjunto de eventos aprobado. No se deduce inactividad de cero demandas abiertas.
- Si falta fecha de solicitud, primera etapa única o fecha/programa de cierre, se deshabilita el total histórico afectado globalmente para evitar presentar una suma parcial.
- El dashboard del supervisor es la fuente de programas. Se conservan todas sus filas, incluso con cero activas; falta comprobar que devuelve los nueve programas y que incluye los que no tienen actividad. No se fabricaron filas ni se amplió el ámbito mediante un catálogo sin verificar permisos.
- Las respuestas agregadas se interpretan conforme a sus DTO; queda pendiente comprobar respuestas reales, ordenación `episodeId`/`stageId`, semántica de consultas sin estado y fechas inclusivas del endpoint de referencias.
- Los resultados desconocidos se incluyen en total y predominio; los empates se muestran conjuntamente.
- La bandeja de cerradas cuenta etapas, y este tablero cuenta episodios. La discrepancia fue informada antes de modificar. No deben esperarse totales idénticos si un episodio tiene varias etapas cerradas.

## 10. Fechas y criterios de atribución

Ingreso: `originalRequestDate`, atribuido al programa de la única etapa con `stageOrder = 1`. Cierre: `closureDate` de episodio con `stateCode = CERRADO`, atribuido a `currentProgram.id`. Se cuenta una vez por episodio; no se interpretan etapas referidas como cierres finales. Se conserva el mes calendario de la fecha sin desplazamientos por zona horaria. No se usan `createdAt`, `updatedAt` ni `closedAt` como sustitutos.

Referencias: primer y último día calendario del mes o año seleccionado. Las referencias pendientes del rango no reemplazan los pendientes de supervisión actual. Debe validarse la interpretación real de los límites del servicio.

## 11. Compilación

`ng serve` compiló correctamente en `http://localhost:4201/`. `npx ng build` terminó correctamente. Registro final: `.local-backups/control-ejecutivo-20261015/build-final.log`. Advertencia preexistente sobre antigüedad de `baseline-browser-mapping`; no se actualizaron dependencias. Fue necesario autorizar ejecución fuera del sandbox por `spawn EPERM` de esbuild.

## 12. Pruebas

Comando: `node --test src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs`.

Resultado: 9 pruebas aprobadas, 0 fallidas. Cubren separación de años y programas, fechas faltantes, atribución ambigua, exclusión de episodios abiertos de los cierres, duplicados, calendario/zona horaria, todas las páginas, rechazo de consultas parciales/cambiantes/repetidas/excesivas y vacío legítimo. El ejecutor necesitó autorización fuera del sandbox por `spawn EPERM`. Los datos sintéticos están exclusivamente en pruebas.

`git diff --check`: sin errores. No se ejecutó la suite Karma completa ni se probaron filtros mediante una sesión autenticada. La validación de plantillas y TypeScript está incluida en Angular build.

## 13. Revisión visual

Se inspeccionó la imagen aprobada y se implementó su distribución con componentes reales. No se logró comparar la aplicación renderizada: el navegador conectado no expuso superficies y Computer Use detuvo el acceso al no poder determinar con suficiente confianza la URL de Chrome en Windows. No se continuó la automatización tras esa detención.

Pendientes: comprobar nueve filas reales, seis tarjetas en una fila, combinación de filtros, retorno a todos los programas, ausencia de recortes, responsive e impresión real. La aceptación visual permanece reservada al responsable.

## 14. Responsive

En escritorio ancho: seis tarjetas, tablas compactas y dos secciones inferiores. Hasta 1200 px: tarjetas en tres columnas y secciones inferiores apiladas. En móvil: dos columnas, filtros redistribuidos y tablas desplazables. Se permite scroll por altura insuficiente, mayor cantidad de programas o despliegue de detalles. No se garantiza ausencia de scroll en escritorio hasta medir la aplicación real con nueve programas y sus nombres/recomendaciones.

## 15. Estado final de Git

Cuatro archivos existentes de Inicio modificados y dos archivos de implementación/pruebas añadidos, más documentación y respaldos. La modificación preexistente de rutas permanece intacta. No se ejecutó git add, commit, merge, push ni despliegue.

## 16. Pendientes y aceptación

No considerar aceptación completa únicamente por compilar. Se requiere validar contra API real: catálogo completo de nueve programas, primera etapa/origen, listados sin estado, paginación y ordenación, cierres únicos frente a bandeja por etapas y rango de referencias. Comprobar los tres filtros juntos contra registros conocidos y renderizar impresión y resoluciones de escritorio/tablet/móvil. Definir funcionalmente movimiento reciente antes de habilitar ese indicador. Mantener `—` donde no exista evidencia suficiente.

El servidor de desarrollo quedó iniciado en localhost:4201 para facilitar esa revisión; la disponibilidad posterior depende de que continúe ejecutándose el proceso local.
