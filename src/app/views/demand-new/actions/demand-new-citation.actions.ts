export interface CitationSuccessResult {
  successMessage: string;
  resetValue: {
    eventDate: Date;
    eventHour: string;
    eventPeriod: string;
    programProfessionalId: null;
    professionName: string;
    comment: string;
    citationComment: string;
  };
}

export function handleCitationSuccess(
  event: any,
): CitationSuccessResult {
  console.log('[DemandNew] Citación registrada:', event);

  return {
    successMessage: 'Citación registrada correctamente.',
    resetValue: {
      eventDate: new Date(),
      eventHour: '',
      eventPeriod: 'AM',
      programProfessionalId: null,
      professionName: '',
      comment: '',
      citationComment: '',
    },
  };
}