import {
  resolveStageDays,
  resolveStageEntryContext,
} from './demand-new-stage.utils';
export interface CompactProgramTrajectoryItem {
  kind: 'stage' | 'reference';
  id: number;
  stageOrder?: number;
  programName?: string;
  stageLabel?: string;
  daysInStage?: number | null;
  entryDate?: string | null;
  current?: boolean;
  closureDate?: string | null;
  reversalDate?: string | null;
  originStageId?: number;
  destinationStageId?: number;
  originProgramName?: string;
  destinationProgramName?: string;
  referenceDate?: string | null;
}

function toNumericId(value: unknown): number | null {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function toNumericValue(value: unknown): number | null {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function buildCompactProgramTrajectory(
  stages: any[],
  references: any[],
  events: any[] = [],
  originalRequestDate: string | null | undefined = null,
): CompactProgramTrajectoryItem[] {
  const safeStages = Array.isArray(stages) ? stages : [];
  const safeReferences = Array.isArray(references) ? references : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const orderedStages = [...safeStages].sort(
    (left: any, right: any) =>
      Number(left?.stageOrder ?? 0) - Number(right?.stageOrder ?? 0),
  );

  const hasExplicitCurrentStage = orderedStages.some(
    (stage: any) =>
      stage?.current === true ||
      stage?.isCurrent === true ||
      stage?.active === true,
  );

  const trajectory: CompactProgramTrajectoryItem[] = [];

  orderedStages.forEach((stage: any, index: number) => {
    const stageId = toNumericId(stage?.id);

    if (stageId === null) {
      return;
    }

    const explicitCurrent =
      stage?.current === true ||
      stage?.isCurrent === true ||
      stage?.active === true;

    const fallbackCurrent =
      !hasExplicitCurrentStage &&
      index === orderedStages.length - 1 &&
      !stage?.closedAt;

    const current = explicitCurrent || fallbackCurrent;
    const stageOrder =
      toNumericValue(stage?.stageOrder) ?? index + 1;

    let stageLabel = `Etapa ${stageOrder}`;

    if (current) {
      stageLabel = 'Etapa actual';
    } else if (index === 0 && orderedStages.length > 1) {
      stageLabel = 'Programa de origen';
    }

    const stageEvents = safeEvents.filter(
      (event: any) =>
        toNumericId(
          event?.stageId ??
          event?.stage?.id ??
          event?.demandStageId,
        ) === stageId,
    );

    const closureEvent = [...stageEvents]
      .reverse()
      .find((event: any) => {
        const code = String(
          event?.eventType?.code ??
          event?.eventTypeCode ??
          event?.typeCode ??
          event?.code ??
          '',
        )
          .trim()
          .toUpperCase();

        return code === 'CIERRE';
      });

    const reversalEvent = [...stageEvents]
      .reverse()
      .find((event: any) => {
        const code = String(
          event?.eventType?.code ??
          event?.eventTypeCode ??
          event?.typeCode ??
          event?.code ??
          '',
        )
          .trim()
          .toUpperCase();

        return code === 'REVERSION';
      });
    const entryContext = resolveStageEntryContext(
      stage,
      safeReferences,
      originalRequestDate,
    );

    const resolvedDaysInStage = resolveStageDays(
      stage,
      safeReferences,
      originalRequestDate,
    );

    trajectory.push({
      kind: 'stage',
      id: stageId,
      stageOrder,
      programName:
        stage?.program?.name ??
        stage?.programName ??
        'Programa sin información',
      stageLabel,
      daysInStage: resolvedDaysInStage,
      entryDate: entryContext.date,
      current,

      closureDate:
        current
          ? stage?.closedAt ?? null
          : stage?.closedAt ??
            closureEvent?.eventDate ??
            null,

      reversalDate:
        reversalEvent?.eventDate ??
        reversalEvent?.createdAt ??
        null,
    });

    const nextStage = orderedStages[index + 1];
    const nextStageId = toNumericId(nextStage?.id);

    if (nextStageId === null) {
      return;
    }

    const relatedReference =
      safeReferences.find(
        (reference: any) =>
          toNumericId(reference?.originStageId) === stageId &&
          toNumericId(reference?.destinationStageId) === nextStageId,
      ) ??
      safeReferences.find(
        (reference: any) =>
          toNumericId(reference?.originStageId) === stageId,
      );

    if (!relatedReference) {
      return;
    }

    trajectory.push({
      kind: 'reference',
      id:
        toNumericId(relatedReference?.id) ??
        Number(`${stageId}${nextStageId}`),
      originStageId: stageId,
      destinationStageId: nextStageId,
      originProgramName:
        relatedReference?.originProgram?.name ??
        stage?.program?.name ??
        stage?.programName ??
        'Programa de origen',
      destinationProgramName:
        relatedReference?.destinationProgram?.name ??
        nextStage?.program?.name ??
        nextStage?.programName ??
        'Programa de destino',
      referenceDate: relatedReference?.referenceDate ?? null,
    });
  });

  return trajectory;
}
