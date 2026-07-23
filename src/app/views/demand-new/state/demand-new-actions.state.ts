import { ActiveActionPanel } from '../models/demand-new-view.types';
import { DemandNewEpisodeState } from './demand-new-episode.state';

export abstract class DemandNewActionsState extends DemandNewEpisodeState {
  activeActionPanel: ActiveActionPanel = null;

  isSavingObservation = false;
  observationError: string | null = null;
  observationSuccess: string | null = null;

  isSavingCitation = false;
  citationError: string | null = null;
  citationSuccess: string | null = null;

  isSavingAttendance = false;
  attendanceError: string | null = null;
  attendanceSuccess: string | null = null;

  isSavingInterview = false;
  interviewError: string | null = null;
  interviewSuccess: string | null = null;

  showBackToNavigation = false;
}
