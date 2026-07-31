export const DEMAND_CITATION_CODES = {
  firstCitationFirstInterview: 'PRIMERA_CITACION_PRIMERA_ENTREVISTA',
  secondCitationFirstInterview: 'SEGUNDA_CITACION_PRIMERA_ENTREVISTA',
  firstCitationSecondInterview: 'PRIMERA_CITACION_SEGUNDA_ENTREVISTA',
  secondCitationSecondInterview: 'SEGUNDA_CITACION_SEGUNDA_ENTREVISTA',
  firstCitationThirdInterview: 'PRIMERA_CITACION_TERCERA_ENTREVISTA',
  secondCitationThirdInterview: 'SEGUNDA_CITACION_TERCERA_ENTREVISTA',
  optionalInterview: 'ENTREVISTA_OPCIONAL',
} as const;

export type DemandWorkflowTone =
  | 'info'
  | 'warning'
  | 'danger';

export type DemandAttendanceKind =
  | 'pending'
  | 'present'
  | 'absent'
  | 'cancelled'
  | 'rescheduled'
  | 'other';

export interface DemandWorkflowCitation {
  id?: number | null;
  typeCode: string;
  typeName?: string | null;
  date?: string | null;
  time?: string | null;
  createdAt?: string | null;
  attendanceCode?: string | null;
  attendanceName?: string | null;
  professionalId?: number | null;
}

export interface DemandWorkflowInput {
  citations: DemandWorkflowCitation[];
  feedbackRegistered: boolean;
  closureRegistered: boolean;
  resultCode?: string | null;
  canManage: boolean;
  programName?: string | null;
  currentDate: string;
}

export interface DemandWorkflowNextAction {
  code: string;
  title: string;
  detail: string;
  tone: DemandWorkflowTone;
  icon: string;
}

function normalizeCode(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function lowerFirst(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function formatDate(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  const parts = text.split('-');

  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : text || 'Sin fecha';
}

function getCitationTimestamp(
  citation: DemandWorkflowCitation,
): string {
  return String(
    citation.createdAt ??
      `${citation.date ?? ''}T${citation.time ?? '00:00:00'}`,
  );
}

function getCitationTypeName(
  citation: DemandWorkflowCitation | null,
  fallback: string,
): string {
  return String(citation?.typeName ?? fallback)
    .trim()
    .replace(/\.$/, '');
}

export function resolveAttendanceKind(
  citation: DemandWorkflowCitation | null,
): DemandAttendanceKind {
  if (!citation) {
    return 'other';
  }

  const status = normalizeCode(
    citation.attendanceCode ??
      citation.attendanceName,
  );

  if (
    !status ||
    status === 'PENDIENTE' ||
    status === 'AGENDADO' ||
    status === 'SIN_ESTADO'
  ) {
    return 'pending';
  }

  if (
    status === 'NO_SE_PRESENTO' ||
    status.includes('NO_SE_PRESENT')
  ) {
    return 'absent';
  }

  if (
    status === 'SE_PRESENTO' ||
    status.includes('SE_PRESENT')
  ) {
    return 'present';
  }

  if (status.includes('REPROGRAM')) {
    return 'rescheduled';
  }

  if (status.includes('CANCEL')) {
    return 'cancelled';
  }

  return 'other';
}

function getLatestCitationByType(
  citations: DemandWorkflowCitation[],
  typeCode: string,
): DemandWorkflowCitation | null {
  return (
    [...citations]
      .filter(
        (citation) =>
          normalizeCode(citation.typeCode) ===
          normalizeCode(typeCode),
      )
      .sort((left, right) =>
        getCitationTimestamp(right).localeCompare(
          getCitationTimestamp(left),
        ),
      )[0] ?? null
  );
}

function buildScheduleAction(
  code: string,
  citation: DemandWorkflowCitation | null,
  fallbackName: string,
  detail: string,
): DemandWorkflowNextAction {
  const name = getCitationTypeName(
    citation,
    fallbackName,
  );

  return {
    code,
    title: `Programar ${lowerFirst(name)}`,
    detail,
    tone: 'warning',
    icon: 'event_available',
  };
}

function buildPendingAttendanceAction(
  citation: DemandWorkflowCitation,
  currentDate: string,
): DemandWorkflowNextAction {
  const name = getCitationTypeName(
    citation,
    'Citación',
  );

  const date = String(citation.date ?? '');
  const time = String(citation.time ?? '').slice(0, 5);

  if (date && date > currentDate) {
    return {
      code: 'CITATION_SCHEDULED',
      title: 'Citación programada',
      detail:
        `${name} · ${formatDate(date)}` +
        (time ? ` · ${time}` : ''),
      tone: 'info',
      icon: 'event',
    };
  }

  if (date && date < currentDate) {
    return {
      code: 'ATTENDANCE_OVERDUE',
      title: 'Regularizar asistencia pendiente',
      detail:
        `${name} del ${formatDate(date)} se encuentra vencida.`,
      tone: 'danger',
      icon: 'notification_important',
    };
  }

  return {
    code: 'REGISTER_ATTENDANCE',
    title: 'Registrar asistencia',
    detail:
      `${name}` +
      (date ? ` · ${formatDate(date)}` : ''),
    tone: 'warning',
    icon: 'how_to_reg',
  };
}

function buildRescheduleAction(
  citation: DemandWorkflowCitation,
): DemandWorkflowNextAction {
  const name = getCitationTypeName(
    citation,
    'citación',
  );

  return {
    code: 'RESCHEDULE_CITATION',
    title: `Reprogramar ${lowerFirst(name)}`,
    detail:
      'La cancelación o reprogramación no cuenta como inasistencia.',
    tone: 'warning',
    icon: 'event_repeat',
  };
}

function hasTwoAbsencesWithSameProfessional(
  citations: DemandWorkflowCitation[],
): boolean {
  const absencesByProfessional = new Map<number, number>();

  citations.forEach((citation) => {
    if (resolveAttendanceKind(citation) !== 'absent') {
      return;
    }

    const professionalId = Number(
      citation.professionalId,
    );

    if (!Number.isFinite(professionalId) || professionalId <= 0) {
      return;
    }

    absencesByProfessional.set(
      professionalId,
      (absencesByProfessional.get(professionalId) ?? 0) + 1,
    );
  });

  return [...absencesByProfessional.values()].some(
    (count) => count >= 2,
  );
}

export function resolveDemandWorkflowNextAction(
  input: DemandWorkflowInput,
): DemandWorkflowNextAction {
  const citations = Array.isArray(input.citations)
    ? input.citations
    : [];

  if (input.closureRegistered) {
    return {
      code: 'PROCESS_COMPLETED',
      title: 'Proceso finalizado',
      detail: 'La demanda registra su cierre formal.',
      tone: 'info',
      icon: 'task_alt',
    };
  }

  if (!input.canManage) {
    return {
      code: 'READ_ONLY',
      title: 'Seguimiento por programa responsable',
      detail:
        `La continuidad de la demanda corresponde a ` +
        `${input.programName || 'su programa responsable'}.`,
      tone: 'info',
      icon: 'visibility',
    };
  }

  if (input.feedbackRegistered) {
    const resultCode = normalizeCode(input.resultCode);

    if (resultCode === 'ABANDONO') {
      return {
        code: 'CLOSE_ABANDONMENT',
        title: 'Registrar cierre por abandono',
        detail:
          'La retroalimentación registró abandono. Corresponde cerrar formalmente la demanda.',
        tone: 'danger',
        icon: 'event_busy',
      };
    }

    return {
      code: 'REGISTER_CLOSURE',
      title: 'Registrar cierre cuando corresponda',
      detail:
        resultCode === 'REFERENCIA'
          ? 'La referencia permanece disponible como acción opcional. El cierre formal sigue siendo obligatorio.'
          : 'La retroalimentación ya fue registrada. El episodio debe cerrarse formalmente cuando corresponda.',
      tone: 'warning',
      icon: 'event_busy',
    };
  }

  const latestCitations = Object.values(
    DEMAND_CITATION_CODES,
  )
    .map((code) =>
      getLatestCitationByType(citations, code),
    )
    .filter(
      (
        citation,
      ): citation is DemandWorkflowCitation =>
        citation !== null,
    );

  const pendingCitation = [...latestCitations]
    .filter(
      (citation) =>
        resolveAttendanceKind(citation) === 'pending',
    )
    .sort((left, right) =>
      getCitationTimestamp(left).localeCompare(
        getCitationTimestamp(right),
      ),
    )[0];

  if (pendingCitation) {
    return buildPendingAttendanceAction(
      pendingCitation,
      input.currentDate,
    );
  }

  const citationToReschedule = [...latestCitations]
    .filter((citation) => {
      const status = resolveAttendanceKind(citation);

      return (
        status === 'cancelled' ||
        status === 'rescheduled'
      );
    })
    .sort((left, right) =>
      getCitationTimestamp(right).localeCompare(
        getCitationTimestamp(left),
      ),
    )[0];

  if (citationToReschedule) {
    return buildRescheduleAction(citationToReschedule);
  }

  if (
    hasTwoAbsencesWithSameProfessional(
      latestCitations,
    )
  ) {
    return {
      code: 'CLOSE_ABSENCES',
      title: 'Registrar cierre por inasistencias',
      detail:
        'Se registran dos inasistencias con el mismo profesional.',
      tone: 'danger',
      icon: 'event_busy',
    };
  }

  const c1e1 = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.firstCitationFirstInterview,
  );

  const c2e1 = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.secondCitationFirstInterview,
  );

  const c1e2 = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.firstCitationSecondInterview,
  );

  const c2e2 = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.secondCitationSecondInterview,
  );

  const c1e3 = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.firstCitationThirdInterview,
  );

  const c2e3 = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.secondCitationThirdInterview,
  );

  const optional = getLatestCitationByType(
    citations,
    DEMAND_CITATION_CODES.optionalInterview,
  );

  if (!c1e1) {
    return buildScheduleAction(
      'SCHEDULE_C1_E1',
      null,
      'Primera citación a primera entrevista',
      'La etapa actual todavía no inicia su secuencia de entrevistas.',
    );
  }

  const c1e1Status = resolveAttendanceKind(c1e1);
  const c2e1Status = resolveAttendanceKind(c2e1);

  if (
    c1e1Status === 'absent' &&
    !c2e1
  ) {
    return buildScheduleAction(
      'SCHEDULE_C2_E1',
      null,
      'Segunda citación a primera entrevista',
      'La primera citación registra inasistencia.',
    );
  }

  const firstInterviewCompleted =
    c1e1Status === 'present' ||
    c2e1Status === 'present';

  if (!firstInterviewCompleted) {
    return {
      code: 'REVIEW_FIRST_INTERVIEW',
      title: 'Revisar continuidad de la primera entrevista',
      detail:
        'No existe una entrevista presentada que permita avanzar automáticamente.',
      tone: 'warning',
      icon: 'fact_check',
    };
  }

  if (!c1e2) {
    return buildScheduleAction(
      'SCHEDULE_C1_E2',
      null,
      'Primera citación a segunda entrevista',
      'Es la continuidad habitual. La retroalimentación permanece disponible si la evaluación ya es suficiente.',
    );
  }

  const c1e2Status = resolveAttendanceKind(c1e2);
  const c2e2Status = resolveAttendanceKind(c2e2);

  if (
    c1e2Status === 'absent' &&
    !c2e2
  ) {
    return buildScheduleAction(
      'SCHEDULE_C2_E2',
      null,
      'Segunda citación a segunda entrevista',
      'La primera citación a segunda entrevista registra inasistencia.',
    );
  }

  const secondInterviewCompleted =
    c1e2Status === 'present' ||
    c2e2Status === 'present';

  if (!secondInterviewCompleted) {
    return {
      code: 'REVIEW_SECOND_INTERVIEW',
      title: 'Revisar continuidad de la segunda entrevista',
      detail:
        'No existe una segunda entrevista presentada que permita avanzar automáticamente.',
      tone: 'warning',
      icon: 'fact_check',
    };
  }

  if (!c1e3) {
    return buildScheduleAction(
      'SCHEDULE_C1_E3',
      null,
      'Primera citación a tercera entrevista',
      'Es la continuidad habitual después de completar la segunda entrevista.',
    );
  }

  const c1e3Status = resolveAttendanceKind(c1e3);
  const c2e3Status = resolveAttendanceKind(c2e3);

  if (
    c1e3Status === 'absent' &&
    !c2e3
  ) {
    return buildScheduleAction(
      'SCHEDULE_C2_E3',
      null,
      'Segunda citación a tercera entrevista',
      'La primera citación a tercera entrevista registra inasistencia.',
    );
  }

  const thirdInterviewCompleted =
    c1e3Status === 'present' ||
    c2e3Status === 'present';

  if (!thirdInterviewCompleted) {
    return {
      code: 'REVIEW_THIRD_INTERVIEW',
      title: 'Revisar continuidad de la tercera entrevista',
      detail:
        'No existe una tercera entrevista presentada que permita avanzar automáticamente.',
      tone: 'warning',
      icon: 'fact_check',
    };
  }

  return {
    code: 'REGISTER_FEEDBACK',
    title: 'Registrar retroalimentación',
    detail:
      optional
        ? 'La entrevista opcional ya fue gestionada. Corresponde registrar la decisión.'
        : 'Las tres entrevistas fueron gestionadas. Puede registrar la retroalimentación o programar la entrevista opcional.',
    tone: 'warning',
    icon: 'fact_check',
  };
}
