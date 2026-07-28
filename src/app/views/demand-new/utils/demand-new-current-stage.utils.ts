function toPositiveId(value: unknown): number | null {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

export function resolveCurrentEpisodeStage(
  longitudinal: any,
  episode: any = null,
): any | null {
  const stages = Array.isArray(longitudinal?.stages)
    ? longitudinal.stages
    : [];

  const stageMarkedAsCurrent =
    stages.find(
      (stage: any) =>
        stage?.current === true ||
        stage?.isCurrent === true ||
        stage?.active === true,
    ) ?? null;

  if (stageMarkedAsCurrent) {
    return stageMarkedAsCurrent;
  }

  const currentStageId =
    toPositiveId(episode?.currentStageId) ??
    toPositiveId(longitudinal?.activeEpisode?.currentStageId) ??
    toPositiveId(longitudinal?.currentStage?.id) ??
    toPositiveId(longitudinal?.activeStage?.id);

  if (currentStageId === null) {
    return null;
  }

  return (
    stages.find(
      (stage: any) =>
        toPositiveId(stage?.id) === currentStageId,
    ) ?? null
  );
}

export function resolveCurrentStageId(
  longitudinal: any,
  episode: any = null,
): number | null {
  return toPositiveId(
    resolveCurrentEpisodeStage(longitudinal, episode)?.id,
  );
}

export function resolveCurrentStageResultCode(
  currentStage: any,
  fallbackEpisode: any = null,
): string {
  const source = currentStage ?? fallbackEpisode;

  return String(
    source?.result?.code ??
      source?.resultCode ??
      source?.currentResult?.code ??
      source?.currentResultCode ??
      '',
  )
    .trim()
    .toUpperCase();
}

export function resolveCurrentStageResultValue(
  currentStage: any,
  fallbackEpisode: any = null,
): unknown {
  const source = currentStage ?? fallbackEpisode;

  return (
    source?.result?.name ??
    source?.resultName ??
    source?.result?.code ??
    source?.resultCode ??
    source?.currentResult?.name ??
    source?.currentResultName ??
    source?.currentResult?.code ??
    source?.currentResultCode ??
    null
  );
}