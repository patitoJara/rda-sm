# Corrección controlada de pruebas Angular

Fecha: 20-10-2026. Rama `v1.0`, HEAD `b5bd29925c49575dc05f6fc8a68c3e41c0a40d6d`. PowerShell UTF-8, sin quit.

## Resultado

Se corrigió la configuración de TestBed de Proyectos. La corrección de la matriz de Demanda queda detenida por contradicción entre documentación/prueba e implementación. No se modificaron componentes productivos ni reglas de negocio.

**Rectificación del diagnóstico anterior:** el fallo de la matriz está en `feedback.enabled`, no en `observation.enabled`. Los informes anteriores que atribuyeron el fallo a observación interpretaron incorrectamente la línea 30. Este informe los rectifica expresamente: la línea 30 comprueba retroalimentación; la 31 comprueba observación.

## FormComponent — causa y cambio

El constructor inyecta `MatDialogRef` y `MAT_DIALOG_DATA`. La aplicación abre el formulario con `MatDialog.open(FormComponent)` para crear y con `{ data: project }` para editar. En ese flujo Material aporta los proveedores del diálogo.

La prueba crea directamente el componente con TestBed y solo importaba `FormComponent`; no reproducía ese contexto de inyección. Se añadieron exclusivamente:

- `MatDialogRef`: objeto espía con método `close`.
- `MAT_DIALOG_DATA`: `null`, correspondiente a un formulario sin proyecto precargado.

La prueba existente de creación ahora pasa, incluida la inicialización del formulario y renderizado mediante `fixture.detectChanges()`. No se cambiaron validaciones, guardado, plantilla ni comportamiento productivo. Esto valida el problema de configuración de la prueba, no sustituye una prueba completa del flujo de Proyectos con backend autenticado.

Archivo fuente modificado: `src/app/views/projects/components/form/form.component.spec.ts`. Se agregó además este informe.

Respaldo previo verificado por SHA-256: `.local-backups/pruebas-angular-20261020/form.component.spec.ts`; hash `32E154840A04DE3C2755CDDB1E2FD6297DD1563C1C0293FC625CD197B3C3CF59`.

## Matriz — investigación y decisión pendiente

Entrada de la prueba:

- Episodio y etapa abiertos.
- Cero citaciones y cero citaciones pendientes.
- Primera entrevista no completada.
- Sin retroalimentación, referencia ejecutada ni resultado de cierre.

Esta entrada alcanza `ACTIVE_INITIAL`. La implementación retorna `observation.enabled = true` y `feedback.enabled = false`, con el mensaje «Debe registrar una citación y su asistencia antes de continuar». La prueba espera ambos en `true`.

El arnés específico documenta que antes de una retroalimentación habilitante están habilitados citación, observación y panel de retroalimentación. Por tanto, la discrepancia no se resuelve cambiando simplemente el contexto de prueba: el caso inicial está explícitamente construido y hay una contradicción funcional real entre esa documentación y el comportamiento vigente.

### Roles y contexto

`resolveDemandActionMatrix` no recibe roles ni concede acceso. Su prueba es de una función pura: no depende de sesión ni de un proveedor Angular.

En el componente, `canManageCurrentEpisode` exige rol activo `ADMINISTRATIVO`, ausencia de errores/cargas, coherencia de episodio/etapa y contexto operativo `MANAGE`; bloquea modo consulta y episodios históricos. La ruta permite `ADMIN`, `ADMINISTRATIVO` y `SUPERVISOR`, pero acceder a la ruta no equivale a gestionar la etapa. La utilidad de permisos verifica programa y etapa abiertos. Ninguna de esas condiciones explica el fallo de esta prueba pura.

### Alternativas para autorización funcional posterior

1. **Ratificar el comportamiento vigente:** impedir retroalimentación hasta contar con citación y asistencia. Requeriría actualizar expresamente la expectativa, el nombre de la prueba y la documentación, conservando observación habilitada.
2. **Ratificar la regla documentada y la prueba:** permitir abrir retroalimentación desde el inicio. Requeriría autorizar un cambio productivo y definir las condiciones para guardar cada resultado, distinguiendo abrir el panel de guardar retroalimentación.

No se eligió ninguna alternativa. Matriz, prueba de matriz, permisos y arnés permanecen intactos. La suite conserva el fallo visible; no se omitió ni debilitó la prueba.

## Verificaciones ejecutadas

| Verificación | Resultado |
| --- | --- |
| Suite Angular completa, ChromeHeadless | **30 aprobadas, 1 fallida** |
| Prueba FormComponent | Aprobada dentro de la suite completa |
| Fallo restante | Retroalimentación en `ACTIVE_INITIAL`, línea 30 de la prueba |
| Todas las pruebas Node | **36 aprobadas, 0 fallidas, 0 omitidas** |
| Regresión PDF incluida en Node | Ejecutada; no omitida |
| `npx tsc --noEmit -p tsconfig.app.json` | Correcto |
| `npm run build -- --configuration production` | Correcto |
| `git diff --check` | Sin errores |

Se conservan advertencias preexistentes de LF/CRLF y del catálogo `baseline-browser-mapping` desactualizado; no se normalizaron archivos ni actualizaron dependencias.

Los registros se encuentran en `.local-backups/pruebas-angular-20261020/`. La suite Angular corrió en navegador local; no se consultaron datos institucionales.

## Integridad y cierre

Todos los archivos del directorio `program-analysis-dialog` mantienen sus hashes iniciales: componente, HTML, SCSS, cálculo de datos, generador y pruebas del reporte. Las 36 pruebas incluyen las 31 del Control Ejecutivo/reporte.

Se preservaron todos los cambios previos. La única nueva diferencia de código rastreado es el archivo de prueba de Proyectos. No se intervino backend, API, diseño, indicadores, referencias, UI Lab ni configuración productiva.

No se ejecutaron `git add`, commit, merge, push ni despliegue. Trabajo detenido después de esta intervención; queda pendiente únicamente la decisión funcional descrita para poder corregir el segundo fallo dentro de este alcance.
