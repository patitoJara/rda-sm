/**
 * MATRIZ CENTRAL DE ACCIONES - GESTIÓN DE DEMANDA
 *
 * FUENTE ÚNICA DE VERDAD PARA:
 * - habilitación/bloqueo de acciones;
 * - opciones de cierre;
 * - mensajes funcionales;
 * - relación Cierre -> Retroalimentación;
 * - comportamiento posterior al cierre.
 *
 * REGLAS GENERALES
 * ----------------
 * 1. Una referencia crea una nueva etapa en otro programa.
 *    La nueva etapa comienza nuevamente desde el escenario inicial.
 *
 * 2. Una referencia NO cierra el episodio completo.
 *    Cierra únicamente la etapa/programa de origen.
 *
 * 3. Después de cualquier cierre exitoso:
 *    - refrescar episodio;
 *    - dejar la etapa cerrada en solo lectura;
 *    - bloquear todas las acciones de esa etapa.
 *
 * 4. Después de registrar una Retroalimentación:
 *    - no se permiten nuevas citaciones;
 *    - no se permite registrar nuevas asistencias.
 *
 * 5. Puede existir más de una citación pendiente simultáneamente.
 *
 * 6. Retroalimentación permanece disponible mientras la etapa esté abierta.
 *
 * 7. Referencia se habilita una vez completada la primera entrevista con asistencia SE_PRESENTO.
 *
 * 8. Abandono puede producirse en cualquier momento mientras el episodio
 *    permanezca activo.
 *
 * 9. Cierre y Retroalimentación son independientes. El cierre no agrega,
 *    reemplaza ni modifica resultados de Retroalimentación.
 *
 * 10. Si el resultado del Cierre ya existe en Retroalimentación,
 *     NO debe duplicarse.
 *
 * 11. CUALQUIER CIERRE convierte la demanda/etapa del programa
 *     que realiza el cierre en HISTÓRICA y SOLO LECTURA.
 *
 *     - REFERENCIA:
 *       la etapa del programa origen queda histórica;
 *       el episodio continúa abierto en el programa receptor;
 *       la nueva etapa receptora comienza desde ACTIVE_INITIAL.
 *
 *     - INGRESO A TRATAMIENTO:
 *       la etapa queda histórica y el episodio queda cerrado.
 *
 *     - ABANDONO:
 *       la etapa queda histórica y el episodio queda cerrado.
 */

export type DemandActionKey =
  | 'citation'
  | 'attendance'
  | 'feedback'
  | 'observation'
  | 'reference'
  | 'closure';

export type DemandClosureOption =
  | 'REFERENCIA'
  | 'INGRESO_TRATAMIENTO'
  | 'ABANDONO';

export type DemandFeedbackResult =
  | 'LISTA_ESPERA'
  | 'REFERENCIA'
  | 'INGRESO_TRATAMIENTO'
  | 'ABANDONO';

export type DemandMatrixScenario =
  | 'ACTIVE_INITIAL'
  | 'ACTIVE_PENDING_CITATIONS'
  | 'ACTIVE_CITATIONS_RESOLVED'
  | 'FEEDBACK_WAITING_LIST'
  | 'FEEDBACK_REFERENCE'
  | 'FEEDBACK_TREATMENT_ENTRY'
  | 'FEEDBACK_ABANDONMENT'
  | 'REFERENCE_EXECUTED'
  | 'CLOSED_TREATMENT_ENTRY'
  | 'CLOSED_ABANDONMENT';

export interface DemandMatrixAction {
  enabled: boolean;
  message: string | null;
}

export interface DemandActionMatrix {
  scenario: DemandMatrixScenario;

  citation: DemandMatrixAction;
  attendance: DemandMatrixAction;
  feedback: DemandMatrixAction;
  observation: DemandMatrixAction;
  reference: DemandMatrixAction;
  closure: DemandMatrixAction;

  allowedClosureOptions: DemandClosureOption[];

  /**
   * true cuando la demanda/etapa de este programa ya tuvo cierre
   * y, por lo tanto, debe mostrarse como histórica.
   */
  historical: boolean;

  /**
   * Una etapa histórica siempre debe quedar en modo solo lectura.
   */
  readonly: boolean;

  /**
   * Todo cierre exitoso obliga a recargar la información del episodio.
   */
  refreshAfterClosure: boolean;
}

export interface DemandActionMatrixInput {
  episodeClosed: boolean;
  stageClosed: boolean;

  citationCount: number;
  pendingCitationCount: number;
  firstInterviewCompleted: boolean;

  feedbackResults: DemandFeedbackResult[];

  referenceExecuted: boolean;

  closureResult?: DemandClosureOption | null;
}

/* ============================================================
 * MENSAJES
 * ============================================================ */

export const DEMAND_ACTION_MATRIX_MESSAGES = {
  stageClosed:
    'La etapa se encuentra cerrada y está disponible únicamente en modo lectura.',

  episodeClosed:
    'La demanda se encuentra cerrada y está disponible únicamente en modo lectura.',

  attendanceNoPending:
    'No existen citaciones pendientes para registrar asistencia.',

  feedbackPendingCitations:
    'Existen citaciones pendientes de respuesta. Registre la asistencia antes de completar una retroalimentación normal.',

  citationsBlockedByFeedback:
    'No es posible registrar nuevas citaciones porque ya existe una retroalimentación para esta etapa.',

  attendanceBlockedByFeedback:
    'No es posible registrar asistencia porque ya existe una retroalimentación para esta etapa.',

  referenceRequiresFirstInterview:
    'La referencia estará disponible después de completar la primera entrevista con asistencia Se presentó.',

  waitingList:
    'La persona queda en Lista de Espera. La demanda permanecerá activa hasta registrar posteriormente Ingreso a Tratamiento o Abandono.',

  reference:
    'Se cerrará la atención de la demanda en el programa actual por Referencia. El episodio permanecerá abierto y continuará su gestión en el programa de destino.',

  treatmentEntry:
    'La demanda será cerrada por Ingreso a Tratamiento. El tiempo de espera finalizará y el formulario quedará en modo solo lectura.',

  abandonment:
    'La demanda será cerrada por Abandono. El resultado Abandono debe quedar registrado en la trazabilidad de Retroalimentación.',

  closureReadonly:
    'El cierre fue registrado correctamente. La información será actualizada y el formulario quedará en modo solo lectura.',
} as const;

/* ============================================================
 * UTILIDADES
 * ============================================================ */

function action(
  enabled: boolean,
  message: string | null = null,
): DemandMatrixAction {
  return {
    enabled,
    message,
  };
}

function hasFeedback(
  input: DemandActionMatrixInput,
  result: DemandFeedbackResult,
): boolean {
  return input.feedbackResults.includes(result);
}

function hasAnyFeedback(input: DemandActionMatrixInput): boolean {
  return input.feedbackResults.length > 0;
}

function blockedMatrix(
  scenario: DemandMatrixScenario,
  message: string,
): DemandActionMatrix {
  return {
    scenario,

    citation: action(false, message),
    attendance: action(false, message),
    feedback: action(false, message),
    observation: action(false, message),
    reference: action(false, message),
    closure: action(false, message),

    allowedClosureOptions: [],

    historical: true,
    readonly: true,
    refreshAfterClosure: true,
  };
}

/* ============================================================
 * MATRIZ CENTRAL
 * ============================================================ */

export function resolveFeedbackSaveAction(
  matrix: DemandActionMatrix,
  resultCode: string | null | undefined,
): DemandMatrixAction {
  const normalizedResult = String(resultCode ?? '')
    .trim()
    .toUpperCase();

  if (!matrix.feedback.enabled) {
    return matrix.feedback;
  }

  if (
    matrix.scenario === 'ACTIVE_PENDING_CITATIONS' &&
    normalizedResult !== 'ABANDONO'
  ) {
    return action(
      false,
      DEMAND_ACTION_MATRIX_MESSAGES.feedbackPendingCitations,
    );
  }

  return action(true);
}

export function resolveDemandActionMatrix(
  input: DemandActionMatrixInput,
): DemandActionMatrix {

  /*
   * CIERRE DEFINITIVO DEL EPISODIO
   */
  if (input.episodeClosed) {
    if (input.closureResult === 'INGRESO_TRATAMIENTO') {
      return blockedMatrix(
        'CLOSED_TREATMENT_ENTRY',
        DEMAND_ACTION_MATRIX_MESSAGES.episodeClosed,
      );
    }

    return blockedMatrix(
      'CLOSED_ABANDONMENT',
      DEMAND_ACTION_MATRIX_MESSAGES.episodeClosed,
    );
  }
  /*
   * ETAPA YA CERRADA.
   *
   * Solo el cierre formal convierte la etapa en histórica
   * y la deja en modo solo lectura.
   */
  if (input.stageClosed) {
    return {
      ...blockedMatrix(
        'REFERENCE_EXECUTED',
        DEMAND_ACTION_MATRIX_MESSAGES.stageClosed,
      ),
      allowedClosureOptions: ['REFERENCIA'],
    };
  }

  /*
   * REFERENCIA YA EJECUTADA, PERO CIERRE AÚN PENDIENTE.
   *
   * La persona ya fue derivada al programa receptor.
   * La etapa de origen todavía debe registrar su cierre formal
   * con causal REFERENCIA.
   */
  if (input.referenceExecuted) {
    return {
      scenario: 'REFERENCE_EXECUTED',

      citation: action(
        false,
        'La etapa ya fue referida a otro programa.',
      ),

      attendance: action(
        false,
        'La etapa ya fue referida a otro programa.',
      ),

      feedback: action(
        false,
        'La etapa ya fue referida a otro programa.',
      ),

      observation: action(true),

      reference: action(
        false,
        'La referencia ya fue registrada para esta etapa.',
      ),

      closure: action(true),

      allowedClosureOptions: ['REFERENCIA'],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * RETROALIMENTACIÓN = REFERENCIA
   *
   * No existen más citaciones ni asistencias en esta etapa.
   */
  if (hasFeedback(input, 'REFERENCIA')) {
    return {
      scenario: 'FEEDBACK_REFERENCE',

      citation: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.citationsBlockedByFeedback,
      ),

      attendance: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.attendanceBlockedByFeedback,
      ),

      feedback: action(false, 'Ya existe una retroalimentación registrada para esta etapa.'),

      observation: action(true),

      reference: action(true),

      closure: action(
        false,
        'Debe registrar la referencia al programa de destino antes de cerrar la atención de este programa.',
      ),

      allowedClosureOptions: [],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * RETROALIMENTACIÓN = INGRESO A TRATAMIENTO
   */
  if (hasFeedback(input, 'INGRESO_TRATAMIENTO')) {
    return {
      scenario: 'FEEDBACK_TREATMENT_ENTRY',

      citation: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.citationsBlockedByFeedback,
      ),

      attendance: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.attendanceBlockedByFeedback,
      ),

      feedback: action(false, 'Ya existe una retroalimentación registrada para esta etapa.'),

      observation: action(true),

      reference: action(false, 'La referencia solo se habilita cuando la retroalimentación define Referencia.'),

      closure: action(true),

      allowedClosureOptions: ['INGRESO_TRATAMIENTO'],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * RETROALIMENTACIÓN = ABANDONO
   */
  if (hasFeedback(input, 'ABANDONO')) {
    return {
      scenario: 'FEEDBACK_ABANDONMENT',

      citation: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.citationsBlockedByFeedback,
      ),

      attendance: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.attendanceBlockedByFeedback,
      ),

      feedback: action(false, 'Ya existe una retroalimentación registrada para esta etapa.'),

      observation: action(true),

      reference: action(false, 'La referencia solo se habilita cuando la retroalimentación define Referencia.'),

      closure: action(true),

      allowedClosureOptions: ['ABANDONO'],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * RETROALIMENTACIÓN = LISTA DE ESPERA
   */
  if (hasFeedback(input, 'LISTA_ESPERA')) {
    return {
      scenario: 'FEEDBACK_WAITING_LIST',

      citation: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.citationsBlockedByFeedback,
      ),

      attendance: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.attendanceBlockedByFeedback,
      ),

      feedback: action(false, 'Ya existe una retroalimentación registrada para esta etapa.'),

      observation: action(true),

      reference: action(false, 'La referencia solo se habilita cuando la retroalimentación define Referencia.'),

      closure: action(true),

      allowedClosureOptions: [
        'INGRESO_TRATAMIENTO',
        'ABANDONO',
      ],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * EXISTEN CITACIONES PENDIENTES.
   *
   * Se pueden seguir creando más citaciones.
   * Se puede registrar asistencia.
   * Retroalimentación permanece accesible, pero una retroalimentación
   * normal no debe guardarse mientras existan citaciones pendientes.
   * ABANDONO sigue siendo posible.
   */
  if (input.pendingCitationCount > 0) {
    return {
      scenario: 'ACTIVE_PENDING_CITATIONS',

      citation: action(true),

      attendance: action(true),

      feedback: action(
        true,
        DEMAND_ACTION_MATRIX_MESSAGES.feedbackPendingCitations,
      ),

      observation: action(true),

      reference: action(false, 'La referencia solo se habilita cuando la retroalimentación define Referencia.'),

      closure: action(false, 'El cierre solo se habilita después de registrar una retroalimentación.'),

      allowedClosureOptions: [],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * EXISTIERON CITACIONES Y TODAS ESTÁN RESPONDIDAS.
   */
  if (input.citationCount > 0) {
    return {
      scenario: 'ACTIVE_CITATIONS_RESOLVED',

      citation: action(true),

      attendance: action(
        false,
        DEMAND_ACTION_MATRIX_MESSAGES.attendanceNoPending,
      ),

      feedback: action(true),

      observation: action(true),

      reference: action(false, 'La referencia solo se habilita cuando la retroalimentación define Referencia.'),

      closure: action(false, 'El cierre solo se habilita después de registrar una retroalimentación.'),

      allowedClosureOptions: [],

      historical: false,
      readonly: false,
      refreshAfterClosure: true,
    };
  }

  /*
   * INICIO DE ETAPA / NUEVO PROGRAMA.
   *
   * Después de una Referencia, la nueva etapa vuelve exactamente aquí.
   */
  return {
    scenario: 'ACTIVE_INITIAL',

    citation: action(true),

    attendance: action(
      false,
      DEMAND_ACTION_MATRIX_MESSAGES.attendanceNoPending,
    ),

    feedback: action(true),

    observation: action(true),

    reference: action(false, 'La referencia solo se habilita cuando la retroalimentación define Referencia.'),

    closure: action(false, 'El cierre solo se habilita después de registrar una retroalimentación.'),

    allowedClosureOptions: [],

    historical: false,
    readonly: false,
    refreshAfterClosure: true,
  };
}

/* ============================================================
 * MENSAJE DE CONFIRMACIÓN DE CIERRE
 * ============================================================ */

export function getClosureConfirmationMessage(
  option: DemandClosureOption,
): string {
  switch (option) {
    case 'REFERENCIA':
      return DEMAND_ACTION_MATRIX_MESSAGES.reference;

    case 'INGRESO_TRATAMIENTO':
      return DEMAND_ACTION_MATRIX_MESSAGES.treatmentEntry;

    case 'ABANDONO':
      return DEMAND_ACTION_MATRIX_MESSAGES.abandonment;
  }
}
