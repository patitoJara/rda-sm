# ARNÉS GLOBAL

## Procedimiento de trabajo

1. Trabajar con PowerShell en UTF-8; confirmar la rama y revisar `git status`.
2. Leer el contexto aplicable según el índice y revisar el código actual.
3. Entender, conversar y definir el cambio y su alcance antes de programar.
4. Conservar un respaldo previo de los archivos existentes que se modificarán.
5. Implementar únicamente el cambio acordado.
6. Para cambios de aplicación, probar primero en localhost y revisar comportamiento y UI; ejecutar `ng build`.
7. Revisar `git diff` del alcance trabajado. Si hay archivos sin seguimiento, revisar también su contenido: el diff normal no los incluye.
8. Actualizar el arnés solo si cambió una regla real o el contexto necesario para trabajar.
9. No publicar sin revisión y confirmación de los cambios.

Los cambios exclusivos de documentación se verifican por contenido, enlaces y diferencias; no requieren levantar la aplicación ni ejecutar `ng build`.

## Principios

- No perder trazabilidad.
- No modificar lógica funcional sin entenderla primero.
- No programar para descubrir el diseño: primero entender y definir; después programar.
- El código actual y el comportamiento comprobado tienen prioridad sobre documentación histórica desactualizada. Una discrepancia no resuelta se marca como pendiente, no como regla.

## Regla de trabajo

Mantener la indicación literal "sin quit".

No reinterpretarla, reemplazarla ni inferir su significado sin confirmación del usuario.
