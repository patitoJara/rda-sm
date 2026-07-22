export function canManageEpisode(
  activeProgramId: number | string | null | undefined,
  sessionProgramId: number | string | null | undefined,
  episodeSummary: any,
  longitudinal: any,
): boolean {
  const normalizedSessionProgramId = Number(
    activeProgramId ?? sessionProgramId,
  );

  const episodeProgramId = Number(
    episodeSummary?.currentProgram?.id ??
      episodeSummary?.currentProgramId ??
      longitudinal?.activeEpisode?.currentProgram?.id ??
      longitudinal?.activeEpisode?.currentProgramId ??
      0,
  );

  return (
    normalizedSessionProgramId > 0 &&
    episodeProgramId > 0 &&
    normalizedSessionProgramId === episodeProgramId
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

  const episodeProgramName =
    episodeSummary?.currentProgram?.name ??
    longitudinal?.activeEpisode?.currentProgram?.name ??
    'otro programa';

  return (
    `Modo consulta: este episodio está actualmente bajo la responsabilidad de ` +
    `${episodeProgramName}. El programa activo de la sesión no puede registrar ` +
    `ni modificar gestiones.`
  );
}