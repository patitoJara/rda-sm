import {
  DEMAND_CITATION_CODES,
  resolveDemandWorkflowNextAction,
} from './demand-workflow.utils';

import type {
  DemandWorkflowCitation,
} from './demand-workflow.utils';

describe('resolveDemandWorkflowNextAction', () => {
  const currentDate = '2026-07-31';

  const buildCitation = (
    typeCode: string,
    attendanceCode: string | null,
    overrides: Partial<DemandWorkflowCitation> = {},
  ): DemandWorkflowCitation => ({
    id: 1,
    typeCode,
    typeName: typeCode,
    date: currentDate,
    time: '10:00:00',
    createdAt: `${currentDate}T10:00:00`,
    attendanceCode,
    attendanceName: null,
    professionalId: 44,
    ...overrides,
  });

  const resolve = (
    citations: DemandWorkflowCitation[],
    feedbackRegistered = false,
  ) =>
    resolveDemandWorkflowNextAction({
      citations,
      feedbackRegistered,
      closureRegistered: false,
      resultCode: 'AUN_SIN_RESULTADO',
      canManage: true,
      programName: 'Programa de prueba',
      currentDate,
    });

  it('propone C1-E1 cuando la etapa no registra citaciones', () => {
    const action = resolve([]);

    expect(action.code).toBe('SCHEDULE_C1_E1');
    expect(action.title).toBe(
      'Primera citación a primera entrevista',
    );
  });

  it('propone registrar asistencia cuando C1-E1 está pendiente hoy', () => {
    const action = resolve([
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationFirstInterview,
        'PENDIENTE',
      ),
    ]);

    expect(action.code).toBe('REGISTER_ATTENDANCE');
    expect(action.title).toBe('Registrar asistencia');
  });

  it('propone C2-E1 cuando C1-E1 registra inasistencia', () => {
    const action = resolve([
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationFirstInterview,
        'NO_SE_PRESENTO',
      ),
    ]);

    expect(action.code).toBe('SCHEDULE_C2_E1');
    expect(action.title).toBe(
      'Segunda citación a primera entrevista',
    );
  });

  it('propone C1-E2 cuando la primera entrevista fue realizada', () => {
    const action = resolve([
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationFirstInterview,
        'SE_PRESENTO',
      ),
    ]);

    expect(action.code).toBe('SCHEDULE_C1_E2');
    expect(action.title).toBe(
      'Primera citación a segunda entrevista',
    );
  });

  it('propone C2-E2 cuando C1-E2 registra inasistencia', () => {
    const action = resolve([
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationFirstInterview,
        'SE_PRESENTO',
      ),
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationSecondInterview,
        'NO_SE_PRESENTO',
        {
          id: 2,
          time: '11:00:00',
        },
      ),
    ]);

    expect(action.code).toBe('SCHEDULE_C2_E2');
    expect(action.title).toBe(
      'Segunda citación a segunda entrevista',
    );
  });

  it('propone retroalimentación cuando las entrevistas necesarias fueron realizadas', () => {
    const action = resolve([
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationFirstInterview,
        'SE_PRESENTO',
      ),
      buildCitation(
        DEMAND_CITATION_CODES.firstCitationSecondInterview,
        'SE_PRESENTO',
        {
          id: 2,
          time: '11:00:00',
        },
      ),
    ]);

    expect(action.code).toBe('REGISTER_FEEDBACK');
    expect(action.title).toBe('Registrar retroalimentación');
  });

  it('propone cierre cuando la retroalimentación ya fue registrada', () => {
    const action = resolve(
      [
        buildCitation(
          DEMAND_CITATION_CODES.firstCitationFirstInterview,
          'SE_PRESENTO',
        ),
        buildCitation(
          DEMAND_CITATION_CODES.firstCitationSecondInterview,
          'SE_PRESENTO',
          {
            id: 2,
            time: '11:00:00',
          },
        ),
      ],
      true,
    );

    expect(action.code).toBe('REGISTER_CLOSURE');
    expect(action.title).toBe(
      'Registrar cierre cuando corresponda',
    );
  });
});