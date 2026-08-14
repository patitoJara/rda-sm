import {
  resolveWorkingStage,
} from './demand-new-stage.utils';

export function canManageEpisode(
  activeProgramId: number | string | null | undefined,
  sessionProgramId: number | string | null | undefined,
  episodeSummary: any,
  longitudinal: any,
): boolean {
  const normalizedSessionProgramId = Number(
    activeProgramId ?? sessionProgramId,
  );

  if (
    !Number.isFinite(normalizedSessionProgramId) ||
    normalizedSessionProgramId <= 0
  ) {
    return false;
  }

  const stages = Array.isArray(longitudinal?.stages)
    ? longitudinal.stages
    : [];

  /*
   * El permiso operativo ya no depende de currentProgram.
   *
   * Un programa puede trabajar sobre su propia etapa aunque el
   * demandante actualmente se encuentre en otro programa.
   *
   * Ejemplo:
   * PAB stage 11 -> Referencia -> PAI stage 13
   *
   * PAI es currentStage, pero PAB conserva como workingStage
   * su stage 11 para completar las acciones que correspondan,
   * incluido el cierre formal pendiente.
   *
   * Qué acciones están habilitadas o bloqueadas corresponde
   * exclusivamente a DemandActionMatrix.
   */
  const workingStage = resolveWorkingStage(
    stages,
    normalizedSessionProgramId,
  );

  return !!workingStage;
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
    'asociada a este episodio sobre la cual pueda realizar gestiones.'
  );
}