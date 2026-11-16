# Finalización del Reporte Ejecutivo Institucional Vertical

Fecha: 20-10-2026. Trabajo con PowerShell UTF-8, sin quit.

## Estado inicial

Rama `v1.0`, HEAD `b5bd29925c49575dc05f6fc8a68c3e41c0a40d6d`.
El árbol ya contenía cambios previos y archivos sin seguimiento. Se conservaron.
Se inspeccionaron los respaldos de `.local-backups/reporte-vertical-pausa-20261015/` sin restaurarlos.

Ya existía `program-analysis-report.ts`, con estructura institucional, carta vertical, resumen y fichas, matriz mensual, resultados, referencias y manejo de información no disponible. No estaba integrado: el botón seguía clonando el tablero para imprimirlo en A4 horizontal.

Antes de editar se respaldaron componente, generador y arnés en `.local-backups/reporte-vertical-final-20261020/`. Allí se preservan estado inicial, hashes, registro de compilación y evidencias de impresión.

## Integración completada

- El botón imprime el generador independiente utilizando una instantánea de los filtros y cálculos ya cargados. No añade consultas.
- Todos los programas generan resumen y fichas, incluidos programas sin demandas activas. Seleccionar uno genera únicamente su ficha.
- La matriz conserva el contexto anual y señala el mes seleccionado y meses futuros.
- Se distinguen episodios ingresados, cierres definitivos y etapas cerradas. Las referencias no se convierten en cierres definitivos.
- Se incluyen otras causales; resultados desconocidos conservan sus códigos. Valores no disponibles se representan con `—`.
- No se asignan listas de espera ni promedios globales a programas individuales.
- El documento espera imágenes y fuentes antes de invocar la impresión y elimina el iframe después.
- Se ajustó exclusivamente el espaciado del documento imprimible para evitar una segunda página con una nota aislada. Los bloques de indicadores evitan saltos internos; textos extraordinariamente extensos pueden requerir páginas adicionales.

## Archivos intervenidos en esta finalización

1. `src/app/views/inicio/program-analysis-dialog/program-analysis-dialog.component.ts`: integración y adaptación de los valores existentes.
2. `src/app/views/inicio/program-analysis-dialog/program-analysis-report.ts`: espaciado y paginación del reporte independiente.
3. `src/app/views/inicio/program-analysis-dialog/program-analysis-report.test.cjs`: ocho pruebas nuevas y generación opcional de muestras sintéticas locales.
4. `harness/06-modulos/inicio/harness.md`: documentación de la impresión vigente.
5. Este informe.

## Validación

- `npx tsc --noEmit -p tsconfig.app.json`: correcto.
- `npm run build`: correcto; salida en `dist/rda-sm`.
- Servidor Angular local: compilación correcta en `http://localhost:4202/`.
- `node --test src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs src/app/views/inicio/program-analysis-dialog/program-analysis-report.test.cjs`: **29 aprobadas, 0 fallidas**, incluidas las **21 preexistentes**.
- Las ocho pruebas nuevas cubren alcance consolidado/individual, filtros, unidades de cierre, datos faltantes, no redistribución global, escape de textos, integración y espera del histórico.
- `git diff --check`: sin errores. Git advierte conversión futura LF/CRLF en archivos previos; no se normalizaron.

### Impresión

Se generaron HTML con datos explícitamente sintéticos, usando el generador real y el logotipo del proyecto. Se imprimieron con Chrome headless y se rasterizaron para revisión:

| Escenario | Páginas | Resultado |
| --- | ---: | --- |
| Consolidado de nueve programas | 10 | Resumen más nueve fichas |
| Programa individual | 1 | Únicamente su ficha |
| Nombre y resultado extraordinariamente extensos | 2 | Continuación del bloque completo con su título |

Todos los PDF tienen tamaño carta vertical (612 × 792 puntos), numeración y márgenes. La extracción no detectó caracteres de reemplazo ni bloques de texto fuera de página. Se revisaron imágenes del resumen, ficha individual, última ficha y ambas páginas del caso extenso: matriz, títulos, notas y contenidos permanecen completos. Se observaron correctamente acentos, eñes, separadores y `—`.

Evidencias locales: `.local-backups/reporte-vertical-final-20261020/qa/`, con HTML, PDF, PNG y `verification.json`. Son muestras de prueba, no reportes institucionales. Las herramientas PDF se instalaron temporalmente dentro del respaldo, sin modificar dependencias del proyecto.

## Integridad del tablero

HTML y SCSS permanecen idénticos tanto al respaldo inicial de esta intervención como a los respaldos de pausa:

| Archivo | SHA-256 |
| --- | --- |
| `program-analysis-dialog.component.html` | `0D641B4790244BCD44B58BEDD9893F739561556B38B4A7B13143CD3E1BCFEDF3` |
| `program-analysis-dialog.component.scss` | `B748399AC90D5005F6A6208ED760399F8BEA47CD23178721CDCEFFEFA892973E` |

También permanecen idénticos `program-analysis-data.ts`, sus 21 pruebas y `inicio.component.ts`, según `protected-hashes.json`. No se modificaron tarjetas, filtros, distribución, tipografía, responsive ni cálculos del tablero.

## Limitaciones y pendientes de aprobación

- No se consultó backend autenticado ni se conciliaron cifras institucionales; los PDF de verificación contienen datos sintéticos.
- Se comprobó el renderizado de Chrome. Quedan pendientes la acción completa desde una sesión autenticada, el diálogo nativo de impresión y una impresora física; otros navegadores no fueron validados.
- La paginación depende del contenido: las fichas normales de prueba ocupan una página; textos excepcionalmente extensos continúan en páginas adicionales sin ocultarlos.
- La información suplementaria no cargada por programa permanece no disponible en el consolidado; obtenerla requeriría consultas adicionales fuera de este alcance.

## Estado final de Git

Se mantiene la rama y HEAD iniciales. Persisten los cambios previos, los cambios de esta intervención y archivos sin seguimiento, incluidos respaldos y documentación. El HTML/SCSS aparece modificado frente a HEAD por trabajo anterior, no por esta finalización.
No se ejecutó `git add`, commit, merge, push ni despliegue. Trabajo detenido para revisión y aprobación expresa del responsable.
