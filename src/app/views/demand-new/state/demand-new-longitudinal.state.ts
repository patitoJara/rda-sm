import { DemandNewActionsState } from './demand-new-actions.state';

export abstract class DemandNewLongitudinalState extends DemandNewActionsState {
  longitudinal: any | null = null;
  isLoadingLongitudinal = false;
  longitudinalError: string | null = null;

  professionals: any[] = [];
  isLoadingProfessionals = false;
  professionalsError: string | null = null;
}
