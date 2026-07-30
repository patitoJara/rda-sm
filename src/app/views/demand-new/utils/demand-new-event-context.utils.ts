export interface EventProgramContext {
  programName: string;
  stageLabel: string;
  displayLabel: string;
  isReference: boolean;
}

function toPositiveId(value: unknown): number | null {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function normalizeCode(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function resolveEventProgramContext(
  event: any,
  stages: any[] = [],
  references: any[] = [],
): EventProgramContext {
  const safeStages = Array.isArray(stages) ? stages : [];
  const safeReferences = Array.isArray(references) ? references : [];

  const eventStageId = toPositiveId(
    event?.stageId ??
      event?.stage?.id ??
      event?.programStageId ??
      event?.programStage?.id,
  );

  const matchedStage =
    safeStages.find(
      (stage: any) =>
        toPositiveId(stage?.id) === eventStageId,
    ) ?? null;

  const programName = String(
    event?.program?.name ??
      event?.programName ??
      matchedStage?.program?.name ??
      matchedStage?.programName ??
      'Programa no informado',
  ).trim();

  const stageOrder = Number(
    matchedStage?.stageOrder ??
      event?.stageOrder ??
      event?.stage?.stageOrder,
  );

  const isCurrentStage =
    matchedStage?.current === true ||
    matchedStage?.isCurrent === true ||
    matchedStage?.active === true;

  const stageLabel = Number.isFinite(stageOrder) && stageOrder > 0
    ? `Etapa ${stageOrder}${isCurrentStage ? ' · Etapa actual' : ''}`
    : isCurrentStage
      ? 'Etapa actual'
      : 'Etapa no informada';

  const eventTypeCode = normalizeCode(
    event?.eventType?.code ??
      event?.eventTypeCode ??
      event?.typeCode ??
      event?.code,
  );

  const eventReferenceId = toPositiveId(
    event?.referenceId ??
      event?.reference?.id ??
      event?.programReferenceId,
  );

  const reference =
    safeReferences.find(
      (item: any) =>
        eventReferenceId !== null &&
        toPositiveId(item?.id) === eventReferenceId,
    ) ??
    (
      eventTypeCode.includes('REFERENCIA')
        ? safeReferences.find(
            (item: any) =>
              toPositiveId(item?.originStageId) === eventStageId,
          )
        : null
    ) ??
    null;

  if (reference) {
    const originProgram = String(
      reference?.originProgram?.name ??
        reference?.originProgramName ??
        programName,
    ).trim();

    const destinationProgram = String(
      reference?.destinationProgram?.name ??
        reference?.destinationProgramName ??
        'Programa de destino no informado',
    ).trim();

    return {
      programName: originProgram,
      stageLabel,
      displayLabel: `${originProgram} → ${destinationProgram}`,
      isReference: true,
    };
  }

  return {
    programName,
    stageLabel,
    displayLabel: `${programName} · ${stageLabel}`,
    isReference: false,
  };
}
