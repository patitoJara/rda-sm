import {
  resolveDemandActionMatrix,
  resolveFeedbackSaveAction,
  DemandActionMatrixInput,
  DemandFeedbackResult,
} from './demand-new-action-matrix.utils';

function buildInput(
  changes: Partial<DemandActionMatrixInput> = {},
): DemandActionMatrixInput {
  return {
    episodeClosed: false,
    stageClosed: false,
    citationCount: 0,
    pendingCitationCount: 0,
    firstInterviewCompleted: false,
    feedbackResults: [],
    referenceExecuted: false,
    closureResult: null,
    ...changes,
  };
}

describe('resolveDemandActionMatrix', () => {
  it('debe iniciar una etapa sin citaciones permitiendo citar y observar, pero bloqueando retroalimentación y cierre', () => {
    const matrix = resolveDemandActionMatrix(buildInput());

    expect(matrix.scenario).toBe('ACTIVE_INITIAL');
    expect(matrix.citation.enabled).toBeTrue();
    expect(matrix.attendance.enabled).toBeFalse();
    expect(matrix.feedback.enabled).toBeFalse();
    expect(matrix.observation.enabled).toBeTrue();
    expect(matrix.reference.enabled).toBeFalse();
    expect(matrix.closure.enabled).toBeFalse();
    expect(matrix.allowedClosureOptions).toEqual([]);
    expect(matrix.historical).toBeFalse();
    expect(matrix.readonly).toBeFalse();
  });

  it('debe mantener referencia bloqueada antes de una retroalimentación habilitante', () => {
    const matrix = resolveDemandActionMatrix(
      buildInput({
        citationCount: 1,
        pendingCitationCount: 0,
        firstInterviewCompleted: true,
      }),
    );

    expect(matrix.reference.enabled).toBeFalse();
  });

  it('LISTA_ESPERA bloquea citaciones y asistencias, y permite solo segunda decisión Referencia', () => {
    const matrix = resolveDemandActionMatrix(
      buildInput({
        citationCount: 1,
        firstInterviewCompleted: true,
        feedbackResults: ['LISTA_ESPERA'],
      }),
    );

    expect(matrix.scenario).toBe('FEEDBACK_WAITING_LIST');
    expect(matrix.citation.enabled).toBeFalse();
    expect(matrix.attendance.enabled).toBeFalse();
    expect(matrix.feedback.enabled).toBeTrue();
    expect(resolveFeedbackSaveAction(matrix, 'REFERENCIA').enabled).toBeTrue();
    expect(resolveFeedbackSaveAction(matrix, 'NO_ES_PERFIL', true).enabled).toBeFalse();
    expect(matrix.observation.enabled).toBeTrue();
    expect(matrix.reference.enabled).toBeTrue();
    expect(matrix.closure.enabled).toBeTrue();
    expect(matrix.allowedClosureOptions).toEqual([
      'INGRESO_TRATAMIENTO',
      'ABANDONO',
    ]);
  });

  (
    [
      'REFERENCIA',
      'NO_ES_PERFIL',
      'INGRESO_TRATAMIENTO',
      'ABANDONO',
    ] as DemandFeedbackResult[]
  ).forEach((result) => {
    it(`debe impedir una segunda retroalimentación después de ${result}`, () => {
      const matrix = resolveDemandActionMatrix(
        buildInput({
          citationCount: 1,
          firstInterviewCompleted: true,
          feedbackResults: [result],
        }),
      );

      expect(matrix.feedback.enabled).toBeFalse();
    });
  });

  it('debe permitir retroalimentación cuando las citaciones están resueltas y aún no existe retroalimentación', () => {
    const matrix = resolveDemandActionMatrix(
      buildInput({
        citationCount: 1,
        pendingCitationCount: 0,
        firstInterviewCompleted: true,
        feedbackResults: [],
      }),
    );

    expect(matrix.scenario).toBe('ACTIVE_CITATIONS_RESOLVED');
    expect(matrix.feedback.enabled).toBeTrue();
  });

  it('No es perfil exige Leve al guardar y habilita únicamente su causal después del registro', () => {
    const before = resolveDemandActionMatrix(buildInput({ citationCount: 1 }));
    expect(resolveFeedbackSaveAction(before, 'NO_ES_PERFIL', false).enabled).toBeFalse();
    expect(resolveFeedbackSaveAction(before, 'NO_ES_PERFIL', true).enabled).toBeTrue();
    const after = resolveDemandActionMatrix(buildInput({ feedbackResults: ['NO_ES_PERFIL'] }));
    expect(after.closure.enabled).toBeTrue();
    expect(after.allowedClosureOptions).toEqual(['NO_ES_PERFIL']);
    expect(after.reference.enabled).toBeFalse();
    expect(after.feedback.enabled).toBeFalse();
    expect(after.citation.enabled).toBeFalse();
    expect(after.attendance.enabled).toBeFalse();
    expect(after.observation.enabled).toBeTrue();
  });

  it('conserva bloqueos y las causales de los demás escenarios', () => {
    for (const result of ['INGRESO_TRATAMIENTO', 'ABANDONO'] as const) {
      expect(resolveDemandActionMatrix(buildInput({feedbackResults: [result]})).allowedClosureOptions).toEqual([result]);
    }
    expect(resolveDemandActionMatrix(buildInput({feedbackResults: ['RED_EXTERNA']})).allowedClosureOptions).toEqual(['ABANDONO']);
    expect(resolveDemandActionMatrix(buildInput({feedbackResults: ['LISTA_ESPERA', 'REFERENCIA'], feedbackCount: 2})).closure.enabled).toBeFalse();
    expect(resolveDemandActionMatrix(buildInput({referenceExecuted: true})).allowedClosureOptions).toEqual(['REFERENCIA']);
    for (const closed of [{stageClosed: true}, {episodeClosed: true}]) {
      expect(resolveDemandActionMatrix(buildInput({...closed, feedbackResults: ['NO_ES_PERFIL']})).closure.enabled).toBeFalse();
    }
    expect(resolveFeedbackSaveAction(resolveDemandActionMatrix(buildInput({citationCount: 1, pendingCitationCount: 1})), 'NO_ES_PERFIL', true).enabled).toBeFalse();
  });
  it('debe bloquear completamente una etapa cerrada', () => {
    const matrix = resolveDemandActionMatrix(
      buildInput({
        stageClosed: true,
      }),
    );

    expect(matrix.citation.enabled).toBeFalse();
    expect(matrix.attendance.enabled).toBeFalse();
    expect(matrix.feedback.enabled).toBeFalse();
    expect(matrix.observation.enabled).toBeFalse();
    expect(matrix.reference.enabled).toBeFalse();
    expect(matrix.closure.enabled).toBeFalse();
    expect(matrix.historical).toBeTrue();
    expect(matrix.readonly).toBeTrue();
  });

  it('debe bloquear completamente un episodio cerrado', () => {
    const matrix = resolveDemandActionMatrix(
      buildInput({
        episodeClosed: true,
        closureResult: 'ABANDONO',
      }),
    );

    expect(matrix.citation.enabled).toBeFalse();
    expect(matrix.attendance.enabled).toBeFalse();
    expect(matrix.feedback.enabled).toBeFalse();
    expect(matrix.observation.enabled).toBeFalse();
    expect(matrix.reference.enabled).toBeFalse();
    expect(matrix.closure.enabled).toBeFalse();
    expect(matrix.historical).toBeTrue();
    expect(matrix.readonly).toBeTrue();
  });
});
