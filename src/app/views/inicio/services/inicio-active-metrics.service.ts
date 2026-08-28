import { Injectable, inject } from '@angular/core';
import {
  expand,
  map,
  Observable,
  reduce,
} from 'rxjs';

import {
  PageDTO,
  PrioritizedEpisodeDTO,
} from '../../../core/models/demand-priority.models';
import { DemandService } from '../../../core/services/demand.service';
import {
  InicioActiveMetrics,
} from '../utils/inicio-active-metrics.utils';
import {
  InicioMetricsFilter,
} from '../utils/inicio-metrics-filter.utils';

@Injectable({
  providedIn: 'root',
})
export class InicioActiveMetricsService {
  private readonly demandService = inject(DemandService);

  load(
    filter: InicioMetricsFilter,
  ): Observable<InicioActiveMetrics> {
    const pageSize = 100;

    const loadPage = (
      page: number,
    ): Observable<PageDTO<PrioritizedEpisodeDTO>> =>
      this.demandService.getPrioritizedEpisodes({
        page,
        size: pageSize,
        programId: filter.programId,
        stateCode: 'EN_TRAMITE',
        resultCode: filter.resultCode,
        search: filter.search,
      });

    return loadPage(0).pipe(
      expand((response) => {
        const currentPage = Number(response?.number ?? 0);
        const totalPages = Number(response?.totalPages ?? 0);

        if (currentPage + 1 >= totalPages) {
          return [];
        }

        return loadPage(currentPage + 1);
      }),
      map((response) => response?.content ?? []),
      reduce(
        (accumulator, pageItems) => {
          for (const episode of pageItems) {
            accumulator.activeDemands += 1;

            if (
              String(episode.resultCode ?? '').trim() ===
              'LISTA_ESPERA'
            ) {
              accumulator.waitingList += 1;
            }

            if (
              String(episode.semaphoreColor ?? '').trim() ===
              'ROJO'
            ) {
              accumulator.redCases += 1;
            }

            if (!episode.firstCitationFirstInterviewDate) {
              accumulator.withoutFirstCitation += 1;
            }

            accumulator.accumulatedDaysTotal += Math.max(
              0,
              Number(episode.accumulatedDays ?? 0),
            );
          }

          return accumulator;
        },
        {
          activeDemands: 0,
          waitingList: 0,
          redCases: 0,
          withoutFirstCitation: 0,
          accumulatedDaysTotal: 0,
        },
      ),
      map((totals) => ({
        activeDemands: totals.activeDemands,
        waitingList: totals.waitingList,
        redCases: totals.redCases,
        withoutFirstCitation: totals.withoutFirstCitation,
        averageWaitingDays:
          totals.activeDemands > 0
            ? Math.round(
                (totals.accumulatedDaysTotal /
                  totals.activeDemands) *
                  10,
              ) / 10
            : 0,
      })),
    );
  }
}