import { SupervisorDashboardDTO } from '../../../core/models/demand-priority.models';

export interface InicioActiveMetrics {
  activeDemands: number;
  waitingList: number;
  redCases: number;
  withoutFirstCitation: number;
  averageWaitingDays: number;
}

export function buildInicioActiveMetrics(
  dashboard: SupervisorDashboardDTO | null | undefined,
): InicioActiveMetrics {
  return {
    activeDemands: Number(dashboard?.activeDemands ?? 0),
    waitingList: Number(dashboard?.waitingList ?? 0),
    redCases: Number(dashboard?.redCases ?? 0),
    withoutFirstCitation: Number(
      dashboard?.withoutFirstCitation ?? 0,
    ),
    averageWaitingDays: Number(
      dashboard?.averageAccumulatedDays ?? 0,
    ),
  };
}