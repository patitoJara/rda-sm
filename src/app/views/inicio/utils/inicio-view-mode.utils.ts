export type InicioEpisodeListMode =
  | 'active'
  | 'closed';

export interface InicioViewPresentation {
  eyebrow: string;
  icon: string;
  title: string;
  subtitle: string;
  tableEyebrow: string;
  tableTitle: string;
  tableSubtitle: string;
  toggleLabel: string;
  toggleIcon: string;
}

const ACTIVE_PRESENTATION: InicioViewPresentation = {
  eyebrow: 'Gestión operativa',
  icon: 'format_list_numbered',
  title: 'Bandeja priorizada de demanda',
  subtitle:
    'Episodios activos ordenados por días acumulados, nivel de alerta, antigüedad de la solicitud y necesidad de gestión.',
  tableEyebrow: 'BANDEJA DE TRABAJO',
  tableTitle: 'Demandas activas ordenadas por prioridad',
  tableSubtitle:
    'Los casos con mayor cantidad de días acumulados aparecen primero.',
  toggleLabel: 'Ver demandas cerradas',
  toggleIcon: 'history',
};

const CLOSED_PRESENTATION: InicioViewPresentation = {
  eyebrow: 'Histórico',
  icon: 'history',
  title: 'Bandeja de demandas cerradas',
  subtitle:
    'Episodios finalizados de todos los programas, con indicadores de resultado y trayectoria.',
  tableEyebrow: 'HISTORIAL DE DEMANDAS',
  tableTitle: 'Demandas cerradas',
  tableSubtitle:
    'Los episodios finalizados se encuentran disponibles en modo de consulta.',
  toggleLabel: 'Volver a demandas activas',
  toggleIcon: 'format_list_numbered',
};

export function resolveInicioViewPresentation(
  mode: InicioEpisodeListMode,
): InicioViewPresentation {
  return mode === 'closed'
    ? CLOSED_PRESENTATION
    : ACTIVE_PRESENTATION;
}