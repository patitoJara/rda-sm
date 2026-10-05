# ARNÉS DE MÓDULOS

## Objetivo

Cada módulo conserva únicamente el contexto necesario para trabajar
sobre su funcionalidad.

## Por módulo registrar

- objetivo;
- responsabilidad;
- reglas específicas;
- condiciones;
- APIs utilizadas;
- estructura de pantalla;
- campos y anchos definidos;
- comportamiento responsive;
- archivos relevantes;
- elementos que no deben romperse.

## Arnés por TypeScript

Todo archivo `.ts` con lógica propia puede tener su arnés.

Formato recomendado:

- RESPONSABILIDAD
- REGLAS CLAVE
- DEPENDENCIAS
- API RELACIONADA
- UI RELACIONADA
- NO ROMPER

El arnés del `.ts` NO debe copiar información completa de API,
UI o reglas compartidas. Debe apuntar a ellas.

## Tamaño

Preferir fichas breves y específicas.
Evitar transformar el arnés en documentación extensa.