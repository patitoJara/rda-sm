import {
  resolveDemandActionMatrix,
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
  it('debe iniciar una etapa permitiendo citar, observar y abandonar', () => {
    const matrix = resolveDemandActionMatrix(buildInput());

    expect(matrix.scenario).toBe('ACTIVE_INITIAL');
    expect(matrix.citation.enabled).toBeTrue();
    expect(matrix.attendance.enabled).toBeFalse();
    expect(matrix.feedback.enabled).toBeTrue();
    expect(matrix.observation.enabled).toBeTrue();
    expect(matrix.reference.enabled).toBeTrue();
    expect(matrix.closure.enabled).toBeTrue();
    expect(matrix.allowedClosureOptions).toEqual(['ABANDONO']);
    expect(matrix.historical).toBeFalse();
    expect(matrix.readonly).toBeFalse();
  });

  it('debe mantener referencia disponible en una etapa abierta', () => {
    const matrix = resolveDemandActionMatrix(
      buildInput({
        citationCount: 1,
        pendingCitationCount: 0,
        firstInterviewCompleted: true,
      }),
    );

    expect(matrix.reference.enabled).toBeTrue();
  });

  it('LISTA_ESPERA debe bloquear nuevas citaciones, asistencias y retroalimentación', () => {
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
    expect(matrix.feedback.enabled).toBeFalse();
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
      'LISTA_ESPERA',
      'REFERENCIA',
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