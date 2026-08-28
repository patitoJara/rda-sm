export interface InicioMetricsFilter {
  programId: number | null;
  resultCode: string | null;
  search: string | null;
}

export function normalizeInicioMetricsFilter(
  input: {
    programId?: number | null;
    resultCode?: string | null;
    search?: string | null;
  },
): InicioMetricsFilter {
  const programId = Number(input.programId);

  return {
    programId:
      Number.isFinite(programId) && programId > 0
        ? programId
        : null,
    resultCode:
      String(input.resultCode ?? '').trim() || null,
    search:
      String(input.search ?? '').trim() || null,
  };
}

export function hasInicioMetricsFilter(
  filter: InicioMetricsFilter,
): boolean {
  return (
    filter.programId !== null ||
    !!filter.resultCode ||
    !!filter.search
  );
}

export function buildInicioMetricsScopeTitle(
  filter: InicioMetricsFilter,
  historical: boolean,
): string {
  if (hasInicioMetricsFilter(filter)) {
    return historical
      ? 'Vista histórica filtrada'
      : 'Vista activa filtrada';
  }

  return historical
    ? 'Vista histórica general'
    : 'Vista general de demandas activas';
}
export function buildInicioMetricsScopeMessage(
  filter: InicioMetricsFilter,
  historical: boolean,
): string {
  if (hasInicioMetricsFilter(filter)) {
    return historical
      ? 'Los indicadores y la tabla corresponden a las demandas cerradas que cumplen los filtros aplicados.'
      : 'Los indicadores y la tabla corresponden a las demandas activas que cumplen los filtros aplicados.';
  }

  return historical
    ? 'Se muestran las demandas cerradas de todos los programas. Puede acotar la información utilizando los filtros disponibles.'
    : 'Se muestran las demandas activas de todos los programas. Puede acotar la información utilizando los filtros disponibles.';
}