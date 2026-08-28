export type InicioClosedResultCode =
  | 'INGRESO_TRATAMIENTO'
  | 'REFERENCIA'
  | 'ABANDONO';

export interface InicioClosedMetrics {
  closedDemands: number;
  treatmentAdmissions: number;
  references: number;
  abandonments: number;
  predominantResultCode: InicioClosedResultCode | null;
  predominantResultLabel: string;
}

export interface InicioClosedMetricTotals {
  closedDemands: number;
  treatmentAdmissions: number;
  references: number;
  abandonments: number;
}

const CLOSED_RESULT_LABELS: Record<
  InicioClosedResultCode,
  string
> = {
  INGRESO_TRATAMIENTO: 'Ingreso a tratamiento',
  REFERENCIA: 'Referencia',
  ABANDONO: 'Abandono',
};

export function buildInicioClosedMetrics(
  totals: InicioClosedMetricTotals,
): InicioClosedMetrics {
  const results: Array<{
    code: InicioClosedResultCode;
    total: number;
  }> = [
    {
      code: 'INGRESO_TRATAMIENTO',
      total: Math.max(0, Number(totals.treatmentAdmissions ?? 0)),
    },
    {
      code: 'REFERENCIA',
      total: Math.max(0, Number(totals.references ?? 0)),
    },
    {
      code: 'ABANDONO',
      total: Math.max(0, Number(totals.abandonments ?? 0)),
    },
  ];

  const predominant = [...results].sort(
    (left, right) => right.total - left.total,
  )[0];

  const hasPredominantResult =
    predominant &&
    predominant.total > 0;

  return {
    closedDemands: Math.max(
      0,
      Number(totals.closedDemands ?? 0),
    ),
    treatmentAdmissions: results[0].total,
    references: results[1].total,
    abandonments: results[2].total,
    predominantResultCode: hasPredominantResult
      ? predominant.code
      : null,
    predominantResultLabel: hasPredominantResult
      ? CLOSED_RESULT_LABELS[predominant.code]
      : 'Sin resultados',
  };
}