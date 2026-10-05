# DEMAND-NEW.COMPONENT.TS

Fuente: `src/app/views/demand-new/demand-new.component.ts`.

## Responsabilidad

Orquestar la ficha longitudinal y conectar formularios, contexto operativo, servicios y presentación. El [módulo](harness.md) contiene el flujo y las referencias a servicios; no repetirlos aquí.

## Áreas que coordina

- Persona/contacto, catálogos y profesionales.
- Episodios, etapa seleccionada, trayectoria e historial.
- Paneles de citación, asistencia, retroalimentación, referencia, cierre y observación.
- Documentos, reportes, confirmaciones y notificaciones.

## Dependencias relevantes

- `ActivatedRoute` y `TokenService`: contexto solicitado y programa de sesión.
- `state/`, `actions/` y `utils/`: estado, preparación de operaciones y decisiones especializadas.
- [Matriz](demand-new-action-matrix.utils.harness.md), permisos/etapas, cronología y workflow: decisiones que integra.
- `FeedbackPanelComponent`, `EpisodeDocumentsComponent`, `ReferenceEmailPreviewDialogComponent`; reportes mediante `CitationReportService` y `SistraReportService`.

## Reglas delicadas

- La matriz recibe datos de la etapa de trabajo; `stageClosed` proviene de `currentProgramContext.closed`. Se pasa `closureResult: null`: no interpretar el nombre del escenario como causa real de cierre.
- Una sugerencia del workflow no concede permiso. La gestión se comprueba aparte mediante `canManageCurrentEpisode`.
- La vista previa de referencia forma parte de la confirmación del guardado; conservar el orden descrito en el módulo.

## Referencias

[API](../../03-api/harness.md) · [UI](../../02-ui/harness.md) · [Negocio](../../04-negocio/harness.md) · [Seguridad](../../05-seguridad/harness.md).
Estas áreas ubican reglas compartidas; los contratos y reglas aún no registrados deben comprobarse en sus fuentes actuales.

## NO ROMPER

- Conservar los límites del módulo: identidad/contexto, acceso, trazabilidad y recarga.
- No reemplazar matriz y permisos por condiciones visuales aisladas.
- Sincronizar formularios, panel activo y datos recargados; no dejar datos de una persona o etapa anterior al cambiar de contexto.
- No convertir pendientes de la matriz en condiciones funcionales sin verificarlos.
