export interface ObservationSuccessResult {
  successMessage: string;
  resetValue: {
    comment: string;
    observation: string;
  };
}

export function handleObservationSuccess(
  event: any,
): ObservationSuccessResult {
  console.log('[DemandNew] Observación registrada:', event);

  return {
    successMessage: 'Observación registrada correctamente.',
    resetValue: {
      comment: '',
      observation: '',
    },
  };
}