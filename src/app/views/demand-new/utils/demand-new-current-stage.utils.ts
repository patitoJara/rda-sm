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

  const selectedStageId = toPositiveId(episode?.currentStageId ?? longitudinal?.episode?.currentStageId);
  if (selectedStageId) return stages.find((stage: any) => toPositiveId(stage?.id) === selectedStageId) ?? null;

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
    toPositiveId(longitudinal?.episode?.currentStageId) ??
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
    const operationalTime = (event: any): string => {
      const code = String(
        event?.eventType?.code ??
        event?.eventTypeCode ??
        event?.event_type_code ??
        '',
      ).toUpperCase();

      const time = String(event?.eventTime ?? '00:00:00');

      if (
        stageIsClosed &&
        code === 'CIERRE' &&
        /^00:00(?::00)?$/.test(time)
      ) {
        return '23:59:59';
      }

      return time;
    };
    const leftTimestamp =
      String(left?.eventDate ?? '') +
      'T' +
      operationalTime(left);

    const rightTimestamp =
      String(right?.eventDate ?? '') +
      'T' +
      operationalTime(right);

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

  const resultCode = resolveCurrentStageResultCode(
    currentStage,
    fallbackEpisode,
  );

  const closureReason =
    currentStage?.closureReason ??
    fallbackEpisode?.closureReason ??
    null;

  const closureCode = String(closureReason?.code ?? '')
    .trim()
    .toUpperCase();

  if (
    resultCode.startsWith('EXTERN_') &&
    resultCode === closureCode &&
    closureReason?.name
  ) {
    return closureReason.name;
  }
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
