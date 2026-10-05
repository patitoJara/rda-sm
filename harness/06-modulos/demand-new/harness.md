# DEMAND-NEW

## Objetivo

Gestionar la ficha longitudinal de una persona, sus episodios de demanda y la operación de la etapa correspondiente al programa activo.

## Responsabilidades principales

- Coordinar búsqueda/edición de persona y contacto, selección o creación de episodio y carga longitudinal.
- Integrar citaciones, asistencias, retroalimentación, referencias, cierres y observaciones.
- Presentar trayectoria, documentos, reportes y notificaciones vinculadas a la gestión.

## Flujo comprobable desde código

Lectura estática del frontend; no implica validación del backend ni pruebas en localhost.

1. Buscar por RUT; cargar antecedentes y episodios, o permitir el registro de la persona.
2. Seleccionar/cargar un episodio o crearlo; resolver el contexto del programa y la etapa de trabajo.
3. Presentar operaciones según acceso y [matriz](demand-new-action-matrix.utils.harness.md), sin imponer una secuencia única.
4. Validar, guardar y actualizar la vista longitudinal. En referencia, cancelar la vista previa no guarda ni envía correo; el envío se intenta solo después de guardar correctamente.
5. Referencia y cierre tienen operaciones separadas en el frontend; contrastar su efecto definitivo con la respuesta recargada.

## APIs referenciadas

Los contratos pertenecen a [API](../../03-api/harness.md), que todavía no contiene fichas de endpoints. Fuentes actuales bajo `src/app/`, sin copiar sus contratos aquí:

- `services/demand/demand-episode.service.ts`: consulta longitudinal y operaciones de episodio/eventos.
- `core/services/demand.service.ts`: catálogos, sustancias y registro de referencia.
- `services/postulant.service.ts`, `services/contact.service.ts`: persona y contacto.
- `services/demand/preload-catalogs.service.ts`, `services/program-professional.service.ts`: catálogos y profesionales.
- `services/demand/demand-notification.service.ts`: destinatarios y notificaciones.
- `core/services/demand-document.service.ts`: documentos, consumido por el componente de documentos.

## Seguridad referenciada

Marco común: [Seguridad](../../05-seguridad/harness.md). Consultar la decisión efectiva del frontend en `canManageCurrentEpisode`, `utils/demand-new-permission.utils.ts` y `TokenService`. Esto no acredita autorización del backend ni sustituye sus controles.

## Estructura general de UI

Búsqueda y editor de persona/contacto; resumen de episodio y trayectoria; paneles de operaciones; historial y documentos; confirmaciones y vista previa del correo de referencia. Aplican los criterios de [UI](../../02-ui/harness.md); la distribución vive en la plantilla y `styles/`.

## Archivos críticos

Base: `src/app/views/demand-new/`.

- `demand-new.component.ts`: [mapa de coordinación](demand-new.component.harness.md).
- `utils/demand-new-action-matrix.utils.ts`: [habilitación de acciones](demand-new-action-matrix.utils.harness.md).
- `utils/demand-new-permission.utils.ts`, `utils/demand-new-stage.utils.ts`: acceso y etapa.
- `utils/demand-new-datetime-validation.utils.ts`, `utils/demand-new-citation-schedule.utils.ts`, `utils/demand-new-workflow.utils.ts`: cronología, citaciones y siguiente acción.
- `documents/episode-documents.component.ts`, `components/reference-email-preview-dialog/reference-email-preview-dialog.component.ts`: documentos y confirmación de destinatarios.

## NO ROMPER

- Asociar cada operación con persona, episodio, programa y etapa correctos; no mezclar eventos de etapas.
- Separar acceso operativo, habilitación de acciones y sugerencia de siguiente paso.
- Conservar trazabilidad y recarga; un error de correo no equivale a fallo del registro ya guardado.
- Consultar las utilidades de cronología y citación antes de cambiar sus condiciones. Las reglas compartidas corresponden a [Negocio](../../04-negocio/harness.md).

## Discrepancias pendientes de verificar

Consultar PENDIENTE DE VERIFICAR de la [matriz](demand-new-action-matrix.utils.harness.md). No convertir comentarios históricos en reglas ni inferir efectos del backend por el nombre de una operación.
