# DEMAND-NEW-ACTION-MATRIX.UTILS.TS

Fuente: `src/app/views/demand-new/utils/demand-new-action-matrix.utils.ts`.

## Propósito

Resolver habilitación de acciones, opciones de cierre y estado histórico/solo lectura según el contexto recibido. No consulta APIs, guarda eventos ni concede permisos de acceso.

## Prioridades comprobadas en la implementación

Se aplica la primera condición coincidente:

1. Episodio cerrado: bloquea todas las acciones y marca histórico/solo lectura.
2. Etapa cerrada: mismo bloqueo. Devuelve `REFERENCIA` como opción de cierre, pero la acción de cierre está deshabilitada.
3. Referencia ejecutada sin los cierres anteriores: permite observación y cierre por `REFERENCIA`; bloquea las demás acciones y todavía no marca histórico/solo lectura.
4. Retroalimentación, en orden: `REFERENCIA`, `INGRESO_TRATAMIENTO`, `ABANDONO`, `LISTA_ESPERA`. Bloquea nuevas citaciones, asistencias y retroalimentaciones; permite observación.
5. Citaciones pendientes; luego citaciones existentes ya resueltas; finalmente escenario inicial.

## Decisiones delicadas

- Retroalimentación `REFERENCIA`: permite referencia, pero bloquea cierre hasta que esté ejecutada.
- `INGRESO_TRATAMIENTO` o `ABANDONO`: habilita solo su respectiva causal de cierre y bloquea referencia.
- `LISTA_ESPERA`: permite referencia y cierre por ingreso a tratamiento o abandono.
- Antes de retroalimentación habilitante, referencia y cierre están bloqueados. Citación, observación y panel de retroalimentación están habilitados; asistencia requiere citaciones pendientes.
- Con citaciones pendientes, abrir retroalimentación no equivale a poder guardarla: `resolveFeedbackSaveAction` solo permite `ABANDONO` en ese escenario.

## Relación con cierre y referencia

`REFERENCE_EXECUTED` aparece para etapa cerrada y para referencia pendiente de cierre: consultar indicadores y acciones, no solo el nombre. `refreshAfterClosure` expresa necesidad de recarga; la matriz no la ejecuta.

Integración y APIs: [módulo](harness.md) y [componente](demand-new.component.harness.md). Reglas compartidas: [Negocio](../../04-negocio/harness.md). Acceso: [Seguridad](../../05-seguridad/harness.md).

## PENDIENTE DE VERIFICAR

- El comentario inicial afirma que la referencia cierra la etapa de origen; la implementación contempla referencia ejecutada sin cierre formal, con observación y cierre habilitados. Verificar el efecto real con backend y aplicación. No registrar cierre automático como regla funcional.
- El comentario vincula referencia con primera entrevista asistida, pero `firstInterviewCompleted` no se utiliza en las decisiones de esta matriz. También afirma disponibilidad de retroalimentación mientras la etapa esté abierta, aunque las ramas con retroalimentación existente la bloquean. Verificar esas afirmaciones antes de reutilizarlas.

## NO ROMPER

Conservar prioridad de cierres, diferencia entre abrir panel y guardar, y separación entre referencia y cierre observada en la implementación. Referencia de comprobación: `utils/demand-new-action-matrix.utils.spec.ts`; su existencia no acredita validación del backend.
