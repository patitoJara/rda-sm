import { EMPTY, Observable, defer, expand, forkJoin, map, reduce } from 'rxjs';
import { PageDTO, PrioritizedEpisodeDTO, PrioritizedEpisodeQuery, PrioritizedEpisodeStageDTO } from '../../../core/models/demand-priority.models';

interface HistorySource {
  getPrioritizedEpisodes(query: PrioritizedEpisodeQuery): Observable<PageDTO<PrioritizedEpisodeDTO>>;
  getPrioritizedEpisodeStages(query: PrioritizedEpisodeQuery): Observable<PageDTO<PrioritizedEpisodeStageDTO>>;
}

/** State must be explicit: an omitted filter is not evidence of an all-state list. */
export function loadHistory(source: HistorySource): Observable<History> {
  const episodes = (stateCode: string) => completePages(page =>
    source.getPrioritizedEpisodes({ page, size: 100, sort: 'episodeId,asc', stateCode }),
  ).pipe(map(rows => {
    if (rows.some(row => row.stateCode !== stateCode)) {
      throw new Error('El listado de episodios no corresponde al estado solicitado.');
    }
    return rows;
  }));
  const stages = (stateCode: string) => completePages(page =>
    source.getPrioritizedEpisodeStages({ page, size: 100, sort: 'stageId,asc', stateCode }),
  ).pipe(map(rows => {
    if (rows.some(row => row.stageStateCode !== stateCode)) {
      throw new Error('El listado de etapas no corresponde al estado solicitado.');
    }
    return rows;
  }));
  return forkJoin({
    active: episodes('EN_TRAMITE'), closed: episodes('CERRADO'),
    activeStages: stages('EN_TRAMITE'), closedStages: stages('CERRADO'),
  }).pipe(map(data => {
    const allEpisodes = [...data.active, ...data.closed];
    const allStages = [...data.activeStages, ...data.closedStages];
    const ids = new Set(allEpisodes.map(row => row.episodeId));
    if (allStages.some(stage => !ids.has(stage.episodeId))) {
      throw new Error('Hay etapas cuyos episodios no aparecen en los listados consultados.');
    }
    if (new Set(allStages.map(stage => stage.stageId)).size !== allStages.length) {
      throw new Error('Etapas duplicadas entre páginas o estados. Actualice la consulta.');
    }
    return buildHistory(allEpisodes, allStages);
  }));
}

/** Never publish partial page totals. Bound work because the API has no date filter. */
export function completePages<T>(load: (page: number) => Observable<PageDTO<T>>): Observable<T[]> {
  return defer(() => {
  let expected: number | undefined;
  let expectedPage = 0;
  return load(0).pipe(
    expand(page => {
      if (!Array.isArray(page.content) || !Number.isInteger(page.totalElements) ||
          !Number.isInteger(page.totalPages) || !Number.isInteger(page.number) ||
          page.totalElements < 0 || page.totalPages < 0 || page.number !== expectedPage++ ||
          page.totalElements > 10000 || page.totalPages > 100) {
        throw new Error('Listado incompleto o superior al límite de consulta de 10.000 registros.');
      }
      expected ??= page.totalElements;
      if (expected !== page.totalElements) throw new Error('Los datos cambiaron durante la consulta. Actualice.');
      return page.number + 1 < page.totalPages ? load(page.number + 1) : EMPTY;
    }),
    reduce((all, page) => all.concat(page.content), [] as T[]),
    map(all => {
      if (all.length !== expected) throw new Error('No se obtuvo el listado completo.');
      return all;
    }),
  );
  });
}

export function dateParts(value: string | null | undefined): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value ?? '');
  if (!match) return null;
  const year = +match[1], month = +match[2], day = +match[3];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month } : null;
}

export interface Movement { episodeId: number; programId: number; year: number; month: number; result: string; }
export interface StageMovement extends Movement { stageId: number; }
export interface History {
  entered: Movement[];
  closed: Movement[];
  entriesComplete: boolean;
  closuresComplete: boolean;
  closedStages: StageMovement[];
  stageClosuresComplete: boolean;
}

/** Stage IDs count management events; episode IDs remain the unit of the annual matrix. */
export function stageResults(history: History, year: number, month = 0, programId = 0, allowedPrograms?: number[]) {
  const rows = history.closedStages.filter(row => row.year === year &&
    (!month || row.month === month) && (!programId || row.programId === programId) &&
    (!allowedPrograms || allowedPrograms.includes(row.programId)));
  const classified = history.stageClosuresComplete && rows.every(row => !!row.result);
  const totals = new Map<string, number>();
  rows.forEach(row => { if (row.result) totals.set(row.result, (totals.get(row.result) ?? 0) + 1); });
  const max = Math.max(0, ...totals.values());
  return {
    total: history.stageClosuresComplete ? rows.length : null,
    count: (result: string): number | null => classified ? totals.get(result) ?? 0 : null,
    predominant: classified ? [...totals].filter(([, count]) => count === max).map(([code]) => code) : null,
  };
}

export function buildHistory(episodes: PrioritizedEpisodeDTO[], stages: PrioritizedEpisodeStageDTO[]): History {
  const history: History = { entered: [], closed: [], entriesComplete: true, closuresComplete: true, closedStages: [], stageClosuresComplete: true };
  const stageIds = new Set<number>();
  for (const stage of stages) {
    if (stage.stageStateCode !== 'CERRADO') continue;
    const closure = dateParts(stage.closureDate);
    if (!Number.isInteger(stage.stageId) || stage.stageId <= 0 || !closure || !stage.programId) {
      history.stageClosuresComplete = false;
      continue;
    }
    if (stageIds.has(stage.stageId)) throw new Error('Etapas cerradas duplicadas. Actualice la consulta.');
    stageIds.add(stage.stageId);
    history.closedStages.push({
      stageId: stage.stageId, episodeId: stage.episodeId, programId: stage.programId,
      ...closure, result: stage.stageResultCode?.trim() ?? '',
    });
  }
  const firstStages = new Map<number, PrioritizedEpisodeStageDTO[]>();
  stages.filter(stage => stage.stageOrder === 1).forEach(stage => {
    firstStages.set(stage.episodeId, [...(firstStages.get(stage.episodeId) ?? []), stage]);
  });
  const unique = new Map(episodes.map(episode => [episode.episodeId, episode]));
  if (unique.size !== episodes.length) throw new Error('Episodios duplicados; actualice la consulta.');
  unique.forEach(episode => {
    const request = dateParts(episode.originalRequestDate);
    const first = firstStages.get(episode.episodeId) ?? [];
    if (!request || first.length !== 1 || !first[0].programId) history.entriesComplete = false;
    else history.entered.push({ episodeId: episode.episodeId, programId: first[0].programId, ...request, result: '' });
    if (episode.stateCode === 'CERRADO') {
      const closure = dateParts(episode.closureDate);
      if (!closure || !episode.currentProgram?.id) history.closuresComplete = false;
      else history.closed.push({ episodeId: episode.episodeId, programId: episode.currentProgram.id, ...closure, result: episode.resultCode || 'SIN_CLASIFICAR' });
    }
  });
  return history;
}
