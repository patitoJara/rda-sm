# Corrección de paginación del reporte institucional

Fecha: 20-10-2026. PowerShell UTF-8, sin quit.

## Diagnóstico reproducido

Con la plantilla anterior y datos sintéticos de nueve programas, colocando «PAI Adolescente Punta Arenas» y el resultado «Abandono / Ingreso a tratamiento» en la octava ficha, Chrome generó **11 páginas**. La ficha ocupaba la página 9 y su nota institucional quedaba sola en la 10. La prueba de regresión falló antes de modificar la plantilla: `11 !== 10`.

El resultado ocupa dos líneas dentro de la cuadrícula de tres columnas. La fila crece con el contenido; los espacios de `section { margin: 7px 0 }` y `aside { padding: 7px 10px; margin-top: 10px }` dejaban una reserva insuficiente. Al exceder la altura imprimible, `aside { break-inside: avoid }` trasladaba la nota completa a otra página. El pie pertenece al margen de cada página, por lo que también aparece en la página adicional; no es un dato desprendido de la ficha.

Se conservó la regla que impide cortar la nota. Los márgenes de sección pasan de 7 a 5 px; el margen superior de la nota, de 10 a 6 px; su relleno vertical, de 7 a 6 px. El bloque final de indicadores y sus notas se agrupa con `break-inside: avoid`, evitando una nota aislada si un contenido excepcional requiere continuación.

No se cambiaron tamaños de letra, escala, ancho, márgenes de página, textos, valores ni cálculos. No se eliminaron notas.

## Archivos intervenidos

- `src/app/views/inicio/program-analysis-dialog/program-analysis-report.ts`: únicamente estructura de agrupación y espaciado de impresión.
- `src/app/views/inicio/program-analysis-dialog/program-analysis-report.test.cjs`: regresión con PDF real y comprobación de correspondencia de totales.
- Este informe.

Los archivos anteriores se respaldaron y sus copias se verificaron por SHA-256 antes de editar en `.local-backups/reporte-paginacion-20261020/`.

## Resultados

| Escenario sintético impreso con Chrome | Páginas finales |
| --- | ---: |
| Consolidado de nueve programas, textos cortos | 10 |
| Ficha individual, texto corto | 1 |
| Consolidado con el resultado de dos líneas en PAI Adolescente Punta Arenas | 10 |
| Ficha individual con ese resultado | 1 |
| Nombre extenso y causal artificial de varios cientos de caracteres | 2 |

El último caso prueba que no se recorta contenido para forzar una página. No representa la longitud del resultado reportado por el usuario.

La regresión verifica cantidad de páginas, formato carta, ausencia de caracteres de reemplazo y exactamente una nota institucional por página en los cuatro casos normales. Se revisaron visualmente la página 9 corregida, la ficha individual y la continuación del caso extraordinario. Ningún bloque de texto de los PDF finales excede los límites de página.

En la regresión, la nota pasa de la página 10 a la 9, con texto entre las coordenadas verticales 709,3 y 739,8 puntos, dentro del área útil de carta. Los PDF y PNG de prueba permanecen en `despues/`; la reproducción anterior se conserva en `antes/`, bajo el respaldo. Son datos sintéticos identificados como tales, no cifras institucionales.

- **31 pruebas aprobadas, cero fallidas y cero omitidas**: las 29 existentes y dos nuevas.
- TypeScript: `npx tsc --noEmit -p tsconfig.app.json`, correcto.
- Angular: `npm run build`, correcto. Advertencia informativa del catálogo `baseline-browser-mapping` desactualizado; no se actualizaron dependencias.
- `git diff --check`: correcto; avisos LF/CRLF de archivos previos, sin normalizarlos.

Para ejecutar también la prueba PDF se requieren Chrome y Python con PyMuPDF: definir `REPORT_PRINT_QA=1`, `REPORT_QA_DIR` y, si es necesario, `CHROME_BIN` y `PYTHONPATH`. Sin la habilitación explícita, solo la prueba de renderizado se omite; las otras 30 pruebas se ejecutan normalmente. En esta intervención se habilitó y ejecutó.

## Verificación de datos, sin modificar cálculos

La nueva prueba compara el resumen contra la suma de fichas para activas, casos rojos, ingresadas, cierres definitivos, etapas cerradas y referencias enviadas/recibidas. Compara además las fichas consolidadas con la selección individual para esos valores y la matriz mensual. Coinciden en las fuentes sintéticas completas utilizadas.

**18 etapas con Referencia frente a 19 referencias enviadas:** son unidades y fuentes distintas:

- Las etapas se cuentan por `stageId`, `programId`, fecha funcional `closureDate` y `stageResultCode = REFERENCIA`, aplicando año/mes.
- Los envíos se toman de `sentReferences` en `/dashboard/supervisor/programs/references`, con parámetros `from` y `to`. El reporte utiliza el agregado existente; no recibe los movimientos individuales ni determina qué fecha aplica internamente ese endpoint.

La diferencia aritmética es un movimiento, pero no permite identificar su causa. No se puede afirmar que exista una etapa faltante, duplicación o error de fecha sin consultar los registros individuales y las reglas del agregado. Tampoco se debe corregir 19 a 18 para hacerlos coincidir. La prueba confirma que ambas magnitudes pueden diferir sin que el reporte las mezcle.

No se consultó un backend autenticado ni se recibió el detalle de esos 18/19 registros. Quedan pendientes su conciliación por identificadores, programa de origen y fechas, y la confirmación de totales institucionales reales. No se modificó lógica para resolver esa diferencia.

## Integridad y estado final

Los hashes iniciales y finales coinciden para:

- `program-analysis-dialog.component.html`: `0D641B4790244BCD44B58BEDD9893F739561556B38B4A7B13143CD3E1BCFEDF3`.
- `program-analysis-dialog.component.scss`: `B748399AC90D5005F6A6208ED760399F8BEA47CD23178721CDCEFFEFA892973E`.
- Componente TypeScript, transformaciones de datos y sus 21 pruebas.

El tablero interactivo permanece intacto. Se preservaron los cambios anteriores y archivos sin seguimiento. Rama `v1.0`, HEAD `b5bd29925c49575dc05f6fc8a68c3e41c0a40d6d`, sin cambios.

La paginación se comprobó con Chrome sobre el caso reproducido, no mediante una impresión física ni una sesión institucional autenticada. Queda la revisión final del responsable con sus datos y configuración de impresión.

No se realizaron commit, merge, push ni despliegue. Trabajo finalizado para revisión y aprobación.
