import {
  hasStageFormalClosure,
} from './demand-new-event.utils';

import {
  resolveStageId,
  resolveWorkingStage,
} from './demand-new-stage.utils';

export function isEpisodeClosed(episode: any): boolean {
  const stateCode = String(
    episode?.state?.code ??
      episode?.stateCode ??
      episode?.status ??
      '',
  )
    .trim()
    .toUpperCase();

  return (
    stateCode === 'CERRADO' ||
    stateCode === 'CERRADA' ||
    !!episode?.closedAt ||
    !!episode?.closureDate
  );
}

export function hasOpenEpisode(
  episodes: any[] | null | undefined,
): boolean {
  return (episodes ?? []).some(
    (episode) => !isEpisodeClosed(episode),
  );
}
export type EpisodeAccessMode =
  | 'NO_ACCESS'
  | 'VIEW'
  | 'MANAGE';

export function resolveEpisodeAccessMode(
  activeProgramId: number | string | null | undefined,
  sessionProgramId: number | string | null | undefined,
  longitudinal: any,
  events: any[] | null | undefined,
): EpisodeAccessMode {
  const normalizedSessionProgramId = Number(
    activeProgramId ?? sessionProgramId,
  );

  if (
    !Number.isFinite(normalizedSessionProgramId) ||
    normalizedSessionProgramId <= 0
  ) {
    return 'NO_ACCESS';
  }

  const stages = Array.isArray(longitudinal?.stages)
    ? longitudinal.stages
    : [];

  /*
   * REGLA CENTRAL DE ACCESO OPERATIVO
   * =================================
   *
   * Toda decisión de funcionamiento relacionada con el acceso
   * a una etapa debe resolverse aquí y no en los componentes.
   *
   * 1. Se busca la etapa de trabajo más reciente correspondiente
   *    al programa activo de la sesión.
   *
   * 2. Si el programa no posee una etapa en el episodio:
   *      NO_ACCESS
   *
   * 3. Si posee una etapa pero ésta tiene cierre formal:
   *      VIEW
   *
   * 4. Si posee una etapa y todavía no tiene cierre formal:
   *      MANAGE
   *
   * Importante:
   *
   * - currentProgram NO determina por sí solo el permiso.
   * - episode.closureDate NO determina el cierre de una etapa.
   * - originProgramId NO determina el permiso.
   * - referenceCount NO determina el permiso.
   *
   * El permiso se determina exclusivamente a partir de:
   *
   *   programa activo
   *        +
   *   workingStage
   *        +
   *   cierre formal de esa workingStage
   *
   * Ejemplo:
   *
   * PAB stage 11
   *      -> REFERENCIA
   * PAI stage 13
   *
   * Mientras stage 11 no tenga CIERRE:
   *      PAB = MANAGE
   *
   * Cuando stage 11 tenga CIERRE:
   *      PAB = VIEW
   *
   * Mientras stage 13 permanezca abierta:
   *      PAI = MANAGE
   */
  const workingStage = resolveWorkingStage(
    stages,
    normalizedSessionProgramId,
  );

  if (!workingStage) {
    return 'NO_ACCESS';
  }

  const workingStageId = resolveStageId(
    workingStage,
  );

  if (!workingStageId) {
    return 'NO_ACCESS';
  }

  if (
    hasStageFormalClosure(
      events ?? [],
      workingStageId,
    )
  ) {
    return 'VIEW';
  }

  return 'MANAGE';
}

export interface EpisodeProgramContextAccess {
  programId: number | string | null | undefined;
  programName?: string | null | undefined;
  stageId: number | string | null | undefined;
  closed: boolean | null | undefined;
}

export function resolveEpisodeAccessModeFromProgramContext(
  activeProgramId: number | string | null | undefined,
  context: EpisodeProgramContextAccess | null | undefined,
): EpisodeAccessMode {
  const normalizedProgramId = Number(activeProgramId);

  if (
    !Number.isFinite(normalizedProgramId) ||
    normalizedProgramId <= 0
  ) {
    return 'NO_ACCESS';
  }

  if (!context) {
    return 'NO_ACCESS';
  }

  const contextProgramId = Number(context.programId);
  const stageId = Number(context.stageId);

  if (
    !Number.isFinite(contextProgramId) ||
    contextProgramId <= 0 ||
    contextProgramId !== normalizedProgramId
  ) {
    return 'NO_ACCESS';
  }

  if (
    !Number.isFinite(stageId) ||
    stageId <= 0
  ) {
    return 'NO_ACCESS';
  }

  if (context.closed === true) {
    return 'VIEW';
  }

  if (context.closed === false) {
    return 'MANAGE';
  }

  return 'NO_ACCESS';
}
export function resolveEpisodeSuggestedActionFromProgramContext(
  activeProgramId: number | string | null | undefined,
  context: EpisodeProgramContextAccess | null | undefined,
  suggestedAction: string | null | undefined,
): string {
  const accessMode =
    resolveEpisodeAccessModeFromProgramContext(
      activeProgramId,
      context,
    );

  if (accessMode === 'MANAGE') {
    return (
      String(suggestedAction ?? '').trim() ||
      'Revisar continuidad'
    );
  }

  if (accessMode === 'VIEW') {
    const programName = String(
      context?.programName ?? '',
    ).trim();

    return programName
      ? `Etapa finalizada en ${programName}`
      : 'Etapa finalizada';
  }

  return 'Sin gestión disponible para este programa';
}
export function canManageEpisode(
  activeProgramId: number | string | null | undefined,
  sessionProgramId: number | string | null | undefined,
  episodeSummary: any,
  longitudinal: any,
  events: any[] | null | undefined,
): boolean {
  return (
    resolveEpisodeAccessMode(
      activeProgramId,
      sessionProgramId,
      longitudinal,
      events,
    ) === 'MANAGE'
  );
}

export function getEpisodeProgramRestrictionMessage(
  canManageCurrentEpisode: boolean,
  episodeSummary: any,
  longitudinal: any,
): string {
  if (canManageCurrentEpisode) {
    return '';
  }

  return (
    'Modo consulta: el programa activo de la sesión no posee una etapa ' +
    'operativa abierta asociada a este episodio.'
  );
}