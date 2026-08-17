import {
  DEMAND_CITATION_CODES,
  resolveAttendanceKind,
  resolveDemandWorkflowNextAction,
} from '../../../shared/utils/demand-workflow.utils';

import type {
  DemandWorkflowCitation,
  DemandWorkflowNextAction,
} from '../../../shared/utils/demand-workflow.utils';

import {
  getAttendanceForCitation,
} from './demand-new-citation.utils';

import {
  resolveCitationTypeCode,
} from './demand-new-citation-schedule.utils';

interface DemandNewWorkflowCitation extends DemandWorkflowCitation {
  registeredByName: string | null;
}

export interface DemandNewWorkflowInput {
  citationEvents: any[];
  currentStageEvents: any[];
  citationTypes: any[];
  feedbackEvents: any[];
  stageClosureDate: string | null;
  resultCode: string;
  canManage: boolean;
  programName: string;
  currentDate: string;
}

function resolveProfessionalId(
  citation: any,
): number | null {
  const value =
    citation?.programProfessionalId ??
    citation?.programProfessional?.id ??
    citation?.professionalId ??
    citation?.professional?.id ??
    null;

  const numericValue = Number(value);

  return Number.isFinite(numericValue) &&
    numericValue > 0
    ? numericValue
    : null;
}

function buildWorkflowCitation(
  citation: any,
  citationEvents: any[],
  currentStageEvents: any[],
  citationTypes: any[],
): DemandNewWorkflowCitation {
  const typeCode = resolveCitationTypeCode(
    citation,
    citationEvents,
    citationTypes,
  );

  const typeName =
    citationTypes.find(
      (item: any) => item?.code === typeCode,
    )?.name ??
    citation?.citationType?.name ??
    citation?.citationTypeName ??
    null;

  const attendance = getAttendanceForCitation(
    citation,
    currentStageEvents,
  );

  return {
    id: Number(citation?.id) || null,
    typeCode,
    typeName,
    date:
      citation?.eventDate ??
      citation?.citationDate ??
      null,
    time:
      citation?.eventTime ??
      citation?.citationTime ??
      null,
    createdAt: citation?.createdAt ?? null,
    registeredByName:
      citation?.registeredByUser?.name ??
      citation?.createdByUser?.name ??
      null,
    attendanceCode:
      attendance?.attendanceStatus?.code ??
      attendance?.attendanceStatusCode ??
      citation?.attendanceStatus?.code ??
      citation?.attendanceStatusCode ??
      null,
    attendanceName:
      attendance?.attendanceStatus?.name ??
      attendance?.attendanceStatusName ??
      citation?.attendanceStatus?.name ??
      citation?.attendanceStatusName ??
      null,
    professionalId: resolveProfessionalId(citation),
  };
}

export function resolveDemandNewNextAction(
  input: DemandNewWorkflowInput,
): DemandWorkflowNextAction {
  const citations = (input.citationEvents ?? []).map(
    (citation: any) =>
      buildWorkflowCitation(
        citation,
        input.citationEvents,
        input.currentStageEvents,
        input.citationTypes,
      ),
  );

  return resolveDemandWorkflowNextAction({
    citations,
    feedbackRegistered:
      (input.feedbackEvents ?? []).length > 0,
    closureRegistered: !!input.stageClosureDate,
    resultCode: input.resultCode,
    canManage: input.canManage,
    programName: input.programName,
    currentDate: input.currentDate,
  });
}

export interface DemandNewCitationMilestone {
  code: string;
  label: string;
  title: string;
  description: string;
  date: string | null;
  attendance: string;
  registered: boolean;
  registeredByName: string | null;
  createdAt: string | null;

}

function getLatestWorkflowCitation(
  citations: DemandNewWorkflowCitation[],
  code: string,
): DemandNewWorkflowCitation | null {
  return (
    [...citations]
      .filter(
        (citation) =>
          citation.typeCode === code,
      )
      .sort((left, right) => {
        const leftDate =
          `${left.date ?? ''}T${left.time ?? '00:00:00'}`;

        const rightDate =
          `${right.date ?? ''}T${right.time ?? '00:00:00'}`;

        return rightDate.localeCompare(leftDate);
      })[0] ?? null
  );
}

function getAttendanceText(
  citation: DemandWorkflowCitation,
): string {
  const status = resolveAttendanceKind(citation);

  switch (status) {
    case 'present':
      return 'Se presentó';

    case 'absent':
      return 'No se presentó';

    case 'cancelled':
      return 'Cancelada por el programa';

    case 'rescheduled':
      return 'Reprogramada';

    case 'pending':
      return 'Asistencia pendiente';

    default:
      return (
        citation.attendanceName ??
        citation.attendanceCode ??
        'Estado no informado'
      );
  }
}

export function buildDemandNewCitationMilestones(
  citationEvents: any[],
  currentStageEvents: any[],
  citationTypes: any[],
): DemandNewCitationMilestone[] {
  const workflowCitations = (citationEvents ?? []).map(
    (citation: any) =>
      buildWorkflowCitation(
        citation,
        citationEvents,
        currentStageEvents,
        citationTypes,
      ),
  );

  const c1e1 = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.firstCitationFirstInterview,
  );

  const c2e1 = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.secondCitationFirstInterview,
  );

  const c1e2 = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.firstCitationSecondInterview,
  );

  const c2e2 = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.secondCitationSecondInterview,
  );

  const c1e3 = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.firstCitationThirdInterview,
  );

  const c2e3 = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.secondCitationThirdInterview,
  );

  const optional = getLatestWorkflowCitation(
    workflowCitations,
    DEMAND_CITATION_CODES.optionalInterview,
  );

  const firstInterviewCompleted =
    resolveAttendanceKind(c1e1) === 'present' ||
    resolveAttendanceKind(c2e1) === 'present';

  const secondInterviewCompleted =
    resolveAttendanceKind(c1e2) === 'present' ||
    resolveAttendanceKind(c2e2) === 'present';

  const thirdInterviewCompleted =
    resolveAttendanceKind(c1e3) === 'present' ||
    resolveAttendanceKind(c2e3) === 'present';

  const definitions = [
    {
      code: DEMAND_CITATION_CODES.firstCitationFirstInterview,
      label: 'C1-E1',
      title: 'Primera citación a primera entrevista',
      description: 'Inicio habitual de la evaluación.',
      citation: c1e1,
      missingStatus: 'Pendiente',
    },
    {
      code: DEMAND_CITATION_CODES.secondCitationFirstInterview,
      label: 'C2-E1',
      title: 'Segunda citación a primera entrevista',
      description: 'Se utiliza cuando fue necesaria una segunda citación.',
      citation: c2e1,
      missingStatus:
        resolveAttendanceKind(c1e1) === 'absent'
          ? 'Pendiente'
          : firstInterviewCompleted
            ? 'No requerida'
            : 'No corresponde todavía',
    },
    {
      code: DEMAND_CITATION_CODES.firstCitationSecondInterview,
      label: 'C1-E2',
      title: 'Primera citación a segunda entrevista',
      description: 'Continuidad habitual después de la primera entrevista.',
      citation: c1e2,
      missingStatus:
        firstInterviewCompleted
          ? 'Pendiente'
          : 'No corresponde todavía',
    },
    {
      code: DEMAND_CITATION_CODES.secondCitationSecondInterview,
      label: 'C2-E2',
      title: 'Segunda citación a segunda entrevista',
      description: 'Se utiliza cuando fue necesaria una segunda citación.',
      citation: c2e2,
      missingStatus:
        resolveAttendanceKind(c1e2) === 'absent'
          ? 'Pendiente'
          : secondInterviewCompleted
            ? 'No requerida'
            : 'No corresponde todavía',
    },
    {
      code: DEMAND_CITATION_CODES.firstCitationThirdInterview,
      label: 'C1-E3',
      title: 'Primera citación a tercera entrevista',
      description: 'Continuidad habitual después de la segunda entrevista.',
      citation: c1e3,
      missingStatus:
        secondInterviewCompleted
          ? 'Pendiente'
          : 'No corresponde todavía',
    },
    {
      code: DEMAND_CITATION_CODES.secondCitationThirdInterview,
      label: 'C2-E3',
      title: 'Segunda citación a tercera entrevista',
      description: 'Se utiliza cuando fue necesaria una segunda citación.',
      citation: c2e3,
      missingStatus:
        resolveAttendanceKind(c1e3) === 'absent'
          ? 'Pendiente'
          : thirdInterviewCompleted
            ? 'No requerida'
            : 'No corresponde todavía',
    },
    {
      code: DEMAND_CITATION_CODES.optionalInterview,
      label: 'Opc.',
      title: 'Entrevista opcional',
      description: 'Puede utilizarse antes de registrar la retroalimentación.',
      citation: optional,
      missingStatus: thirdInterviewCompleted
        ? 'Opcional · sin registro'
        : 'No corresponde todavía',
    },
  ];

  return definitions.map((definition) => ({
    code: definition.code,
    label: definition.label,
    title: definition.title,
    description: definition.description,
    date: definition.citation?.date ?? null,
    attendance: definition.citation
      ? getAttendanceText(definition.citation)
      : definition.missingStatus,
    registered: !!definition.citation,
    registeredByName:
      definition.citation?.registeredByName ?? null,
    createdAt:
      definition.citation?.createdAt ?? null,
  }));
}
