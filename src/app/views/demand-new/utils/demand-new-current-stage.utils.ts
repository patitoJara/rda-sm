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

export function filterEventsByStage(
  events: any[],
  stageId: number | null,
): any[] {
  const safeEvents = Array.isArray(events) ? events : [];
  const numericStageId = toPositiveId(stageId);

  if (numericStageId === null) {
    return [...safeEvents];
  }

  return safeEvents.filter(
    (event: any) =>
      toPositiveId(
        event?.stageId ?? event?.stage?.id,
      ) === numericStageId,
  );
}

export function resolveLatestOperationalStageEvent(
  events: any[],
  currentStage: any = null,
): any | null {
  const safeEvents = Array.isArray(events) ? events : [];

  const stageStateCode = String(
    currentStage?.stateCode ??
      currentStage?.state?.code ??
      '',
  ).toUpperCase();

  const stageIsClosed =
    Boolean(currentStage?.closedAt) ||
    stageStateCode === 'CERRADO';

  const operationalEvents = stageIsClosed
    ? safeEvents
    : safeEvents.filter((event: any) => {
        const eventTypeCode = String(
          event?.eventType?.code ??
            event?.eventTypeCode ??
            event?.event_type_code ??
            '',
        ).toUpperCase();

        return eventTypeCode !== 'CIERRE';
      });

  if (!operationalEvents.length) {
    return null;
  }

  return [...operationalEvents].sort((left: any, right: any) => {
    const leftTimestamp =
      String(left?.eventDate ?? '') +
      'T' +
      String(left?.eventTime ?? '00:00:00');

    const rightTimestamp =
      String(right?.eventDate ?? '') +
      'T' +
      String(right?.eventTime ?? '00:00:00');

    const operationalComparison =
      rightTimestamp.localeCompare(leftTimestamp);

    if (operationalComparison !== 0) {
      return operationalComparison;
    }

    const leftCreatedAt = String(left?.createdAt ?? '');
    const rightCreatedAt = String(right?.createdAt ?? '');

    return rightCreatedAt.localeCompare(leftCreatedAt);
  })[0];
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
