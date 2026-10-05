# RDA-SM - ARNÉS DE TRABAJO

Guía rápida de condiciones necesarias antes de cambiar código; no documentación del código.

## Orden de lectura

1. [Global](01-global/harness.md): procedimiento y principios de trabajo.
2. [Módulos](06-modulos/harness.md): criterio de las fichas. Para demanda, leer [demand-new](06-modulos/demand-new/harness.md).
3. Leer la ficha del TypeScript intervenido, si existe: [componente principal](06-modulos/demand-new/demand-new.component.harness.md) o [matriz de acciones](06-modulos/demand-new/demand-new-action-matrix.utils.harness.md).
4. Consultar solo las áreas aplicables: [UI](02-ui/harness.md), [API](03-api/harness.md), [Negocio](04-negocio/harness.md) y [Seguridad](05-seguridad/harness.md).
5. Para retomar trabajo, consultar [Estado](07-estado/harness.md); para entender un motivo, [Decisiones](08-decisiones/harness.md).

## Principio

Cargar solo el contexto necesario para el trabajo actual. No duplicar información entre arneses.
