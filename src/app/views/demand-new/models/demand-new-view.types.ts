export type ActiveActionPanel =
  | 'citation'
  | 'attendance'
  | 'interview'
  | 'observation'
  | 'reference'
  | 'treatmentEntry'
  | 'egressClosure'
  | null;

export type SummarySectionId =
  | 'demanda-actual'
  | 'demandante'
  | 'trayectoria'

  | 'trazabilidad'
  | 'citaciones'
  | 'observaciones'
  | 'documentos'
  | 'informe-sistra'
  | 'alertas';

export interface SummaryNavigationItem {
  id: SummarySectionId;
  label: string;
  icon: string;
}
