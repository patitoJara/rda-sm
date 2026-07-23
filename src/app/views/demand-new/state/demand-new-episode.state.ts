import { DemandNewPersonState } from './demand-new-person.state';

export abstract class DemandNewEpisodeState extends DemandNewPersonState {
  stageVisualState = 'Pendiente de creación';

  episodeEvents: any[] = [];

  episodeLoaded = false;
  stageLoaded = false;

  showCreateEpisodeForm = false;

  isSavingEpisode = false;
  episodeSaveError: string | null = null;

  createdEpisode: any | null = null;
  episodeSummary: any | null = null;
}
