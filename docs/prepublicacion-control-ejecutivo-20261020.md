# Cierre técnico y preparación de publicación RDA-SM

Fecha: 20-10-2026. PowerShell UTF-8, sin quit.

**Recomendación: NO APTO para publicación todavía.** El diseño y la impresión cuentan con aprobación del responsable y las pruebas específicas pasan, pero existen condiciones pendientes de aceptación funcional, configuración y aislamiento del artefacto. No se ejecutaron operaciones de publicación ni se cambiaron fuentes de aplicación.

## 1. Estado inicial y final de Git

- Rama: `v1.0`.
- HEAD: `b5bd29925c49575dc05f6fc8a68c3e41c0a40d6d`.
- Cinco archivos rastreados modificados al inicio: `app.routes.ts`, `inicio.component.ts` y los tres archivos del componente de análisis.
- Cuatro archivos de datos/reporte y pruebas sin seguimiento pertenecen al alcance.
- También existen cambios independientes de UI Lab, documentación interna y numerosos respaldos locales. Se inventariaron por separado y se preservaron.
- No había cambios preparados en el índice. No se ejecutó `git add`, commit, merge, push, limpieza, restauración ni despliegue. Rama, HEAD y fuentes de aplicación se mantienen.
- Esta intervención agrega únicamente este informe y evidencias bajo `.local-backups/prepublicacion-20261020/`.

Evidencias locales: `git-inicial.txt`, `git-final.txt`, `tracked.diff`, `untracked-completo.txt`, manifiesto de candidatos, copia de fuentes candidatas, registros de pruebas y auditorías. Los respaldos anteriores de Control Ejecutivo, corrección de datos, UTF-8, reporte y paginación siguen disponibles. Los respaldos locales no sustituyen un respaldo del sitio actualmente publicado.

## 2. Conjunto candidato para un futuro commit

Se identificaron y copiaron, con SHA-256 en `candidate-manifest.json`, estos ocho archivos:

1. `src/app/views/inicio/inicio.component.ts`
2. `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.ts`
3. `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.html`
4. `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.scss`
5. `src/app/views/inicio/program-analysis-dialog/program-analysis-data.ts`
6. `src/app/views/inicio/program-analysis-dialog/program-analysis-report.ts`
7. `src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs`
8. `src/app/views/inicio/program-analysis-dialog/program-analysis-report.test.cjs`

Es una **lista candidata, no un commit ni un paquete aprobado**. Los HTML/SCSS difieren de HEAD porque contienen el desarrollo ya aprobado; no fueron modificados durante este cierre. Las pruebas pertenecen al repositorio fuente y no al artefacto web.

Excluir de esta actualización:

- `src/app/app.routes.ts`: su diferencia introduce UI Lab, independiente del Control Ejecutivo.
- `src/app/views/ui-lab/**`: desarrollo independiente.
- `.local-backups/**`, todos los archivos `.bak*`, herramientas Python, perfiles Chrome, PDF sintéticos y registros.
- Documentos internos, imágenes de referencia y arneses del artefacto web. Su incorporación al repositorio documental puede decidirse aparte.

No usar `git add .` ni publicar directamente el `dist` del árbol mezclado. Tras resolver los bloqueos y recibir autorización, construir desde una copia/revisión aislada con únicamente el conjunto aprobado y volver a validar su artefacto. No se hizo esa selección en el índice porque no se cumplieron todas las condiciones de aceptación.

## 3. Compilación y pruebas finales

| Verificación | Resultado |
| --- | --- |
| Todas las pruebas Node `*.test.cjs` de `src` | **36 aprobadas, 0 fallidas, 0 omitidas** |
| Dentro de ellas: pruebas específicas de Control Ejecutivo/reporte | **31 aprobadas**, incluida regresión PDF real |
| `npx tsc --noEmit -p tsconfig.app.json` | Correcto |
| `npm run build -- --configuration production` | Correcto |
| `npx ng test --watch=false --browsers=ChromeHeadless` | **29 aprobadas, 2 fallidas** |
| `git diff --check` | Correcto; advertencias LF/CRLF de archivos previos |

Fallos de la suite Angular, distintos de las 31 pruebas Node del módulo:

1. `FormComponent should create`, en Proyectos: falta un proveedor de `MatDialogRef` en el entorno de prueba.
2. `resolveDemandActionMatrix debe iniciar una etapa permitiendo citar, retroalimentar y observar`: `matrix.observation.enabled` devuelve `false` cuando la prueba espera `true` (`demand-new-action-matrix.utils.spec.ts:30`).

Los archivos implicados no tienen diferencias frente a HEAD y no importan el módulo modificado en esas pruebas. Es evidencia de problemas fuera del alcance; no equivale a una ejecución comparativa completa de HEAD. No se alteraron pruebas ni reglas operativas para obtener una aprobación artificial. Deben resolverse o contar con una evaluación expresa antes de liberar.

La compilación muestra aviso informativo de `baseline-browser-mapping` desactualizado. No se actualizaron dependencias.

## 4. Aceptación del reporte y del tablero

La regresión con Chrome comprobó nuevamente:

- Consolidado sintético de nueve programas: **10 páginas**.
- Consolidado con «Abandono / Ingreso a tratamiento»: **10 páginas**.
- Fichas individuales de ambos escenarios: **1 página**.
- Una nota institucional por página en esos escenarios, tamaño carta y ausencia de caracteres de reemplazo.
- Caso artificial de varios cientos de caracteres: dos páginas para preservar el contenido. No se promete una página para texto ilimitado.

Se conserva la aprobación visual y de impresión otorgada por el responsable. La inspección visual detallada de la paginación consta en `correccion-paginacion-reporte-20261020.md`; la plantilla no cambió desde esa inspección.

Las pruebas cubren filtros, fechas funcionales, etapas por programa, episodio único, referencias sucesivas, cierre definitivo, cobertura/paginación y ausencia de datos. La suma del resumen coincide con las fichas cuando la fuente de referencias contiene exactamente los programas esperados; la auditoría adicional detectó la excepción del apartado siguiente.

HTML y SCSS coinciden con los hashes aprobados:

- HTML: `0D641B4790244BCD44B58BEDD9893F739561556B38B4A7B13143CD3E1BCFEDF3`
- SCSS: `B748399AC90D5005F6A6208ED760399F8BEA47CD23178721CDCEFFEFA892973E`

No se modificaron diseño, dimensiones, reglas, datos, contratos, permisos ni backend.

**Sesión autenticada: pendiente.** El inventario de superficies conectadas devolvió cero navegadores y cero aplicaciones. Se solicitó acceso a una pestaña de supervisor o evidencia anonimizada; no se dispuso de ello durante este cierre. No se recuperaron credenciales desde archivos o perfiles ni se hicieron cambios institucionales.

## 5. Referencias: conciliación pendiente y hallazgo adicional

### 18 etapas con Referencia frente a 19 referencias enviadas

No es correcto equiparar ambas unidades:

- Etapas: identificador `stageId`, programa de la etapa, `closureDate`, `stageResultCode = REFERENCIA`, año/mes seleccionados.
- Envíos: `sentReferences` del agregado `/dashboard/supervisor/programs/references?from=…&to=…`.

El frontend no recibe el detalle que permite explicar ese agregado ni conocer su criterio interno de fecha. Sin los identificadores y fechas reales no es posible decidir si la diferencia concreta es legítima o un defecto. No se declaró conciliada ni se cambiaron las cifras.

Para cerrar la aceptación: comparar ambos listados para el mismo programa y período, sin nombres ni RUN, mediante identificadores de referencia/etapa/episodio, origen/destino, fecha funcional de cierre y fecha aplicada al movimiento. Documentar cada registro no emparejado y la regla verificada. La diferencia numérica por sí sola no acredita un error, pero la falta de conciliación impide satisfacer esta aceptación solicitada.

### Hallazgo independiente: alcance del agregado

`references` filtra solo por el programa seleccionado. En «Todos», acepta todas las filas del endpoint. `referenceCoverage` comprueba que estén los programas esperados, pero no rechaza programas adicionales. `referenceTotal` suma todas las filas; las fichas se generan únicamente desde `allPrograms`.

Una auditoría sintética añadió una fila con `programId = 999`, ajena a los nueve programas, y un envío:

- `referenceCoverage = true`.
- Resumen: 19 envíos.
- Suma de fichas: 18 envíos.

Evidencia: `reference-scope-audit.json`. Es una condición reproducible de inconsistencia si la respuesta del backend tiene un alcance mayor; no se afirma que suceda con los datos reales. **No explica por sí misma los 18 cierres de etapa frente a 19 envíos de PAI Adulto Magallanes**, que son indicadores diferentes dentro de un programa.

Antes de publicar se necesita verificar la garantía real de alcance del endpoint o autorizar una corrección específica y sus pruebas. No se modificaron los cálculos durante este cierre.

## 6. Configuración, rutas, recursos y revisión de secretos

- API configurada: `https://gestiondemanda-api.dssm.cl/api/v1`.
- Autenticación configurada: `https://gestiondemanda-api.dssm.cl/auth`.
- `angular.json` no define `fileReplacements` de producción. La compilación optimizada utiliza `environment.ts`, con `production: false`, `enableDebugTools: true` y `frontendVersion: '2026-07-01-sirus-test-01'`.
- `enableDebugTools` activa registros de sincronización horaria; la versión interviene en la limpieza controlada de caché. Son configuraciones preexistentes que requieren revisión expresa; no se dedujo que el flag `production` desactive las optimizaciones del compilador.
- La ruta Inicio sigue existente y protegida por los guards actuales. El nuevo reporte se abre desde el diálogo; no necesita una nueva ruta.
- El build actual incluye UI Lab debido al cambio independiente de `app.routes.ts`. **No es el artefacto exclusivo de la actualización propuesta.**
- Salida web: `dist/rda-sm/browser`. `index.html` referencia recursos existentes; `assets/logoSSM.png` existe y coincide con el original.
- `<base href="/">` y el logotipo absoluto `/assets/logoSSM.png` requieren confirmar publicación en la raíz del dominio. Un subdirectorio no está validado.
- No se encontraron archivos `.bak`, `.ts`, `.cjs`, `.map`, `.md`, `.local-backups`, `docs` o `harness` en el artefacto inspeccionado. Solo se deben publicar los recursos compilados requeridos, nunca el repositorio completo.
- Revisión de los ocho candidatos: UTF-8 válido, sin caracteres de reemplazo; sin coincidencias de patrones de claves privadas, JWT, claves cloud o asignaciones literales de secretos. Es una revisión acotada, no una garantía absoluta sobre todo el repositorio ni sobre configuraciones remotas.

## 7. Destino y commit propuesto

- Rama propuesta: `v1.0`.
- Remoto Git identificado: `https://github.com/patitoJara/rda-sm.git`.
- Mensaje propuesto: `feat(inicio): incorporar control ejecutivo y reporte institucional vertical`.
- **Destino de alojamiento no confirmado**: no se encontró pipeline ni procedimiento de despliegue en la documentación/configuración revisada. El host de API no identifica necesariamente el servidor del frontend. Quedan por confirmar URL pública, servidor/plataforma, directorio/release activo, mecanismo de cambio y responsable.

No se creó commit ni se probó acceso de escritura al remoto.

## 8. Plan de respaldo, publicación y reversión

Plan preparado, **no ejecutado**:

1. Resolver las condiciones anteriores y obtener aprobación expresa del conjunto exacto, destino y ventana de despliegue.
2. Identificar la versión realmente publicada; no asumir que coincide con HEAD local. Conservar su artefacto completo, checksums y referencia de release.
3. Respaldar configuración del servidor web, reglas SPA, cabeceras y caché mediante el mecanismo vigente, almacenando configuración sensible fuera del repositorio y del artefacto público. Confirmar que el respaldo sea recuperable antes de intervenir.
4. Construir y probar el conjunto aprobado en una copia aislada con dependencias bloqueadas; verificar que no incluya UI Lab ni temporales. Registrar commit futuro, configuración, checksums y resultados.
5. Tras autorización definitiva, publicar la nueva release con el mecanismo del alojamiento, preferentemente conservando la anterior y cambiando la referencia activa. No aplicar comandos de copia/borrado hasta conocer el destino.
6. Si falla login, recursos, rutas, indicadores o impresión: volver a activar el artefacto anterior y su configuración correspondiente; renovar la caché según el procedimiento del alojamiento y repetir comprobaciones.
7. No revertir datos ni backend: esta actualización es de frontend. No usar `git reset` para tratar de restaurar el sitio publicado.

## 9. Verificaciones posteriores al despliegue

- Confirmar versión publicada y recursos sin 404, incluidos logotipo, fuentes y chunks.
- Abrir Inicio por navegación directa y recarga, con reglas SPA funcionando.
- Iniciar sesión con un rol autorizado y comprobar restricciones de acceso.
- Comparar activas, ingresos, cierres y referencias contra registros identificables del período aprobado; probar filtros Año/Mes/Programa y cobertura completa.
- Verificar que referencia cierra etapa y no duplica ingresos ni cierres definitivos.
- Confirmar igualdad de resumen/fichas dentro del mismo ámbito y resolver expresamente los registros de la diferencia 18/19.
- Imprimir nueve programas en diez páginas y una ficha en una página, incluyendo el resultado de dos líneas; revisar UTF-8, notas, tablas y pies.
- Revisar navegación y flujos esenciales de otros módulos, sin crear registros ficticios en producción.
- Ante un fallo material, ejecutar el procedimiento de reversión aprobado y registrar el resultado.

**Conclusión:** preparación documental e inventario completos; publicación retenida. Se requiere resolver/aceptar los fallos externos de pruebas, comprobar sesión y conciliación real, cerrar el alcance de referencias, confirmar configuración/destino y validar un artefacto aislado. Esperar autorización posterior expresa antes de cualquier operación Git de publicación o despliegue.
