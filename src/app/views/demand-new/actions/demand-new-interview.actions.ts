export interface InterviewSuccessResult {
  successMessage: string;
  resetValue: {
    eventDate: Date;
    eventHour: string;
    eventPeriod: string;
    comment: string;
    observation: string;
    nextAction: string;
    nextActionDate: null;
  };
}

export function handleInterviewSuccess(
  event: any,
): InterviewSuccessResult {
  console.log('[DemandNew] Entrevista registrada:', event);

  return {
    successMessage: 'Entrevista registrada correctamente.',
    resetValue: {
      eventDate: new Date(),
      eventHour: '',
      eventPeriod: 'AM',
      comment: '',
      observation: '',
      nextAction: '',
      nextActionDate: null,
    },
  };
}