import { DemandNewPersonState } from './demand-new-person.state';

export abstract class DemandNewEpisodeState extends DemandNewPersonState {
  stageVisualState = 'Pendiente de creación';

  episodeEvents: any[] = [];

  secondarySubstanceMap: { [id: number]: number } = {};

  episodeLoaded = false;
  stageLoaded = false;

  showCreateEpisodeForm = false;

  isSavingEpisode = false;
  episodeSaveError: string | null = null;
  episodeSaveSuccess: string | null = null;

  createdEpisode: any | null = null;
  episodeSummary: any | null = null;
}