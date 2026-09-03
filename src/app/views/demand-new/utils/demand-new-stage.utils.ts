export function resolveStageProgramId(
  stage: any,
): number | null {
  const programId = Number(
    stage?.program?.id ??
      stage?.programId,
  );

  return Number.isFinite(programId) && programId > 0
    ? programId
    : null;
}

export function resolveStageId(
  stage: any,
): number | null {
  const stageId = Number(
    stage?.id ??
      stage?.stageId,
  );

  return Number.isFinite(stageId) && stageId > 0
    ? stageId
    : null;
}

export function resolveStageOrder(
  stage: any,
): number {
  const order = Number(stage?.stageOrder ?? stage?.order ?? 0);

  return Number.isFinite(order)
    ? order
    : 0;
}

export function resolveStageById(
  stages: any[] | null | undefined,
  stageId: number | string | null | undefined,
): any | null {
  const normalizedStageId = Number(stageId);

  if (
    !Array.isArray(stages) ||
    !Number.isFinite(normalizedStageId) ||
    normalizedStageId <= 0
  ) {
    return null;
  }

  return (
    stages.find(
      (stage: any) =>
        resolveStageId(stage) === normalizedStageId,
    ) ?? null
  );
}

export function resolveOperationalEventDate(
  event: any,
  stages: any[] | null | undefined,
): string | null {
  if (!event) {
    return null;
  }

  return event?.eventDate ?? event?.createdAt ?? null;
}
export function resolveStagesForProgram(
  stages: any[] | null | undefined,
  programId: number | string | null | undefined,
): any[] {
  const normalizedProgramId = Number(programId);

  if (
    !Array.isArray(stages) ||
    !Number.isFinite(normalizedProgramId) ||
    normalizedProgramId <= 0
  ) {
    return [];
  }

  return stages
    .filter(
      (stage: any) =>
        resolveStageProgramId(stage) === normalizedProgramId,
    )
    .sort(
      (a: any, b: any) =>
        resolveStageOrder(a) - resolveStageOrder(b),
    );
}

export function resolveLatestStageForProgram(
  stages: any[] | null | undefined,
  programId: number | string | null | undefined,
): any | null {
  const programStages = resolveStagesForProgram(
    stages,
    programId,
  );

  return programStages.length
    ? programStages[programStages.length - 1]
    : null;
}

export function resolveWorkingStage(
  stages: any[] | null | undefined,
  activeProgramId: number | string | null | undefined,
  requestedStageId?: number | string | null,
): any | null {
  /*
   * Si se solicita explícitamente una etapa concreta,
   * ésta tiene prioridad siempre que pertenezca
   * al programa activo de la sesión.
   */
  const requestedStage = resolveStageById(
    stages,
    requestedStageId,
  );

  const normalizedProgramId = Number(activeProgramId);

  if (
    requestedStage &&
    Number.isFinite(normalizedProgramId) &&
    resolveStageProgramId(requestedStage) === normalizedProgramId
  ) {
    return requestedStage;
  }

  /*
   * En operación normal se trabaja sobre la pasada
   * más reciente del programa activo.
   */
  return resolveLatestStageForProgram(
    stages,
    activeProgramId,
  );
}

export function resolveWorkingStageId(
  stages: any[] | null | undefined,
  activeProgramId: number | string | null | undefined,
  requestedStageId?: number | string | null,
): number | null {
  return resolveStageId(
    resolveWorkingStage(
      stages,
      activeProgramId,
      requestedStageId,
    ),
  );
}

export interface StageEntryContext {
  kind: 'ORIGINAL_REQUEST' | 'REFERENCE_RECEPTION';
  code: string;
  title: string;
  date: string | null;
  originProgramName: string | null;
  registeredByName: string | null;
  createdAt: string | null;
}

export function resolveStageEntryContext(
  stage: any,
  references: any[] | null | undefined,
  originalRequestDate: string | null | undefined,
): StageEntryContext {
  const stageId = resolveStageId(stage);

  const stageOrder = Number(
    stage?.stageOrder ??
      stage?.order ??
      0,
  );

  if (!Number.isFinite(stageOrder) || stageOrder <= 1) {
    return {
      kind: 'ORIGINAL_REQUEST',
      code: 'Solic.',
      title: 'Solicitud original',
      date: originalRequestDate ?? null,
      originProgramName: null,
      registeredByName: null,
      createdAt: null,
    };
  }

  const safeReferences = Array.isArray(references)
    ? references
    : [];

  const incomingReference =
    safeReferences.find(
      (reference: any) =>
        Number(reference?.destinationStageId) === stageId,
    ) ?? null;

  return {
    kind: 'REFERENCE_RECEPTION',
    code: 'Ref.',
    title: 'Recepción por referencia',
    date:
      incomingReference?.referenceDate ??
      incomingReference?.eventDate ??
      null,
    originProgramName:
      incomingReference?.originProgram?.name ??
      incomingReference?.originProgramName ??
      null,
    registeredByName:
      incomingReference?.registeredByName ??
      incomingReference?.createdByUser?.name ??
      incomingReference?.registeredByUser?.name ??
      null,
    createdAt:
      incomingReference?.createdAt ??
      null,
  };
}

export interface StageReceptionContext {
  kind: 'INITIAL_RECEPTION' | 'REFERENCE_RECEPTION';
  label: string;
  date: string | null;
}

export function resolveStageReceptionContext(
  stage: any,
  references: any[] | null | undefined,
): StageReceptionContext {
  const stageId = resolveStageId(stage);

  const safeReferences = Array.isArray(references)
    ? references
    : [];

  const incomingReference =
    safeReferences.find(
      (reference: any) =>
        Number(reference?.destinationStageId) === stageId,
    ) ?? null;

  if (incomingReference) {
    return {
      kind: 'REFERENCE_RECEPTION',
      label: 'Recepción por referencia',
      date:
        incomingReference?.referenceDate ??
        incomingReference?.eventDate ??
        stage?.receivedAt ??
        null,
    };
  }

  return {
    kind: 'INITIAL_RECEPTION',
    label: 'Ingreso al programa',
    date:
      stage?.receivedAt ??
      stage?.createdAt ??
      null,
  };
}

export function resolveStageDays(
  stage: any,
  references: any[] | null | undefined,
  originalRequestDate: string | null | undefined,
): number {
  const backendDays = Number(stage?.daysInStage);

  if (Number.isFinite(backendDays) && backendDays >= 0) {
    return Math.trunc(backendDays);
  }

  const entryContext = resolveStageEntryContext(
    stage,
    references,
    originalRequestDate,
  );

  if (!entryContext.date) {
    return 0;
  }

  const startDate = new Date(entryContext.date);

  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

  const endDateValue =
    stage?.closureDate ??
    stage?.closedAt ??
    stage?.closureAt ??
    null;

  const endDate = endDateValue
    ? new Date(endDateValue)
    : new Date();

  if (Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const startUtc = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );

  const endUtc = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  const diffMs = endUtc - startUtc;

  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / 86400000);
}
