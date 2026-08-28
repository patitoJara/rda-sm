import { Injectable, inject } from '@angular/core';
import {
  forkJoin,
  map,
  Observable,
  of,
} from 'rxjs';

import { DemandService } from '../../../core/services/demand.service';
import {
  buildInicioClosedMetrics,
  InicioClosedMetrics,
} from '../utils/inicio-closed-metrics.utils';
import {
  InicioMetricsFilter,
} from '../utils/inicio-metrics-filter.utils';

@Injectable({
  providedIn: 'root',
})
export class InicioClosedMetricsService {
  private readonly demandService = inject(DemandService);

  load(
    filter: InicioMetricsFilter,
  ): Observable<InicioClosedMetrics> {
    const baseQuery = {
      page: 0,
      size: 1,
      programId: filter.programId,
      stateCode: 'CERRADO',
      search: filter.search,
    };

    const countByResult = (
      resultCode:
        | 'INGRESO_TRATAMIENTO'
        | 'REFERENCIA'
        | 'ABANDONO',
    ): Observable<number> => {
      if (
        filter.resultCode &&
        filter.resultCode !== resultCode
      ) {
        return of(0);
      }

      return this.demandService
        .getPrioritizedEpisodes({
          ...baseQuery,
          resultCode,
        })
        .pipe(
          map((response) =>
            Number(
              response?.totalElements ?? 0,
            ),
          ),
        );
    };

    return forkJoin({
      closed:
        this.demandService.getPrioritizedEpisodes({
          ...baseQuery,
          resultCode: filter.resultCode,
        }),
      treatment:
        countByResult('INGRESO_TRATAMIENTO'),
      references:
        countByResult('REFERENCIA'),
      abandonments:
        countByResult('ABANDONO'),
    }).pipe(
      map((responses) =>
        buildInicioClosedMetrics({
          closedDemands: Number(
            responses.closed?.totalElements ?? 0,
          ),
          treatmentAdmissions:
            responses.treatment,
          references:
            responses.references,
          abandonments:
            responses.abandonments,
        }),
      ),
    );
  }
}