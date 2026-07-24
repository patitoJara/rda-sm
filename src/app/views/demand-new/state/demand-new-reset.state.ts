export interface DemandNewResetTarget {
  selectedPerson: any | null;
  selectedContact: any | null;

  longitudinal: any | null;
  episodeSummary: any | null;
  createdEpisode: any | null;
  episodeEvents: any[];

  personLoaded: boolean;
  episodeLoaded: boolean;
  stageLoaded: boolean;

  searched: boolean;
  personNotFound: boolean;

  showDemandantDetails: boolean;
  showCreatePersonForm: boolean;
  showCreateEpisodeForm: boolean;
  showBackToNavigation: boolean;

  activeActionPanel: any;
  stageVisualState: string;

  searchError: string | null;
  personSaveError: string | null;
  episodeSaveError: string | null;
  episodeSaveSuccess: string | null;
  longitudinalError: string | null;

  citationError: string | null;
  citationSuccess: string | null;

  attendanceError: string | null;
  attendanceSuccess: string | null;

  interviewError: string | null;
  interviewSuccess: string | null;

  observationError: string | null;
  observationSuccess: string | null;
}

export function resetLoadedDemandView(target: DemandNewResetTarget): void {
  target.selectedPerson = null;
  target.selectedContact = null;

  target.longitudinal = null;
  target.episodeSummary = null;
  target.createdEpisode = null;
  target.episodeEvents = [];

  target.personLoaded = false;
  target.episodeLoaded = false;
  target.stageLoaded = false;

  target.searched = false;
  target.personNotFound = false;

  target.showDemandantDetails = false;
  target.showCreatePersonForm = false;
  target.showCreateEpisodeForm = false;
  target.showBackToNavigation = false;

  target.activeActionPanel = null;
  target.stageVisualState = 'Pendiente de creación';

  target.searchError = null;
  target.personSaveError = null;
  target.episodeSaveError = null;
  target.episodeSaveSuccess = null;
  target.longitudinalError = null;

  target.citationError = null;
  target.citationSuccess = null;

  target.attendanceError = null;
  target.attendanceSuccess = null;

  target.interviewError = null;
  target.interviewSuccess = null;

  target.observationError = null;
  target.observationSuccess = null;
}