# Inicio — Control ejecutivo de demanda

Aplicar primero el arnés global y UI. El tablero vive en `program-analysis-dialog` y se abre desde `InicioComponent`.

- Separar la situación operativa actual de los movimientos del año/mes. Un filtro histórico no reconstruye estados actuales.
- Conservar prioridad, motivos y recomendaciones operativas; no usar ausencia de actividad como evaluación de desempeño.
- El listado de programas del dashboard del supervisor determina el ámbito del tablero. No filtrar por demandas activas mayores que cero.
- Regla confirmada: referir cierra la etapa del programa de origen con resultado `REFERENCIA`, pero el episodio continúa abierto en el receptor. Una nueva referencia es otra gestión, nunca otro ingreso global.
- La bandeja histórica existente cuenta etapas. Las seis tarjetas, la supervisión y la matriz anual conservan episodios únicos: no reutilizar totales de etapas como cierres definitivos.
- El bloque inferior «Resultados de gestión · etapas» utiliza etapas únicas por `stageId`, fecha funcional `closureDate`, `programId` de la etapa y `stageResultCode`. Incluye referencias y otras causales. Los totales de etapas no representan personas ni episodios distintos.
- Mantener separadas las referencias enviadas/recibidas del servicio de referencias. No imponer igualdad con cierres de etapa por referencia sin conciliar registros y fechas.
- Referencias del período: validar la respuesta completa contra los identificadores de `allPrograms` antes de seleccionar un programa. Programas adicionales, faltantes o duplicados invalidan el conjunto: usar el aviso existente y `—` en consolidado y fichas, sin totales parciales. Conservar intacta la respuesta API; no excluir programas sin demandas activas. Ambos consumen la misma selección validada; cambiar de programa no elude una inconsistencia del período.
- Un resultado desconocido conserva su código; un resultado ausente impide publicar un desglose completo. Una fecha de etapa ausente no se sustituye por cierre del episodio o fecha técnica.
- Las fechas analíticas son `originalRequestDate` y `closureDate`; nunca sustituirlas por fechas técnicas. La atribución de ingreso necesita una primera etapa única (`stageOrder = 1`).
- No publicar sumas parciales: verificar todas las páginas y sus totales. Ante ausencia de fechas, programa ambiguo, consulta fallida o límite excedido, mostrar `—`.
- El histórico consulta explícitamente `EN_TRAMITE` y `CERRADO`, tanto para episodios como para etapas; nunca interpretar la ausencia de filtro como garantía de todos los estados. Verificar estado devuelto, páginas completas, episodios únicos y cobertura de los episodios presentes en etapas. Una referencia con etapa cerrada no equivale a cierre del episodio.
- Pendiente de validación con API real: aceptación de ambos filtros de episodio, valores efectivamente devueltos, cobertura de programas sin actividad, primera etapa y rango inclusivo de referencias. No declarar aceptación completa sin esa comprobación.
- «Sin movimiento reciente» no tiene ventana/eventos aprobados: mantener no disponible hasta definirlos.
- Pantallas pequeñas, muchos programas o detalles expandidos pueden necesitar scroll. No ocultar información para evitarlo.
- Impresión: `program-analysis-report.ts` genera un documento independiente en carta vertical desde una instantánea de los cálculos existentes, sin nuevas consultas. Todos los programas: resumen institucional y fichas; programa seleccionado: solo su ficha. No clonar el tablero ni modificar su HTML/SCSS. Conservar logotipo, filtros y alcance temporal; distinguir etapas de cierres definitivos. Las métricas suplementarias globales no se distribuyen entre fichas: mostrar `—` cuando no exista el dato por programa. Esperar imágenes y fuentes antes de imprimir. Validar paginación en navegador, incluidos textos extensos, antes de aprobar.

Mantener literal «sin quit». No realizar operaciones Git de publicación sin autorización expresa.
