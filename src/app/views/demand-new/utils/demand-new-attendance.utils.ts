import { toStringOrNull } from './demand-new-format.utils';

export interface BuildAttendancePayloadParams {
  raw: {
    citationEventId: number | null;
    attendanceStatusId: number | null;
    comment: string | null;
  };
  selectedCitation: any;
  programId: number;
  longitudinal: any;
}

export function buildAttendancePayload({
  raw,
  selectedCitation,
  programId,
  longitudinal,
}: BuildAttendancePayloadParams): any {
  return {
    eventTypeCode: 'ASISTENCIA',

    eventDate:
      toStringOrNull(selectedCitation?.eventDate),

    eventTime: selectedCitation?.eventTime ?? null,

    stageId:
      longitudinal?.activeEpisode?.currentStageId ??
      longitudinal?.stages?.find((stage: any) => stage?.current)?.id ??
      null,

    programId: Number(programId),

    relatedEventId: raw.citationEventId
      ? Number(raw.citationEventId)
      : null,

    attendanceStatusId: raw.attendanceStatusId
      ? Number(raw.attendanceStatusId)
      : null,

    programProfessionalId:
      selectedCitation?.programProfessionalId ??
      selectedCitation?.programProfessional?.id ??
      null,

    professionName: toStringOrNull(selectedCitation?.professionName),

    comment: toStringOrNull(raw.comment),
  };
}
