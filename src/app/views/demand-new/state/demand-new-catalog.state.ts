import {
  DemandCatalogItem,
  DemandCatalogsDTO,
} from '../../../core/services/demand.service';

import { DemandNewLongitudinalState } from './demand-new-longitudinal.state';

export abstract class DemandNewCatalogState extends DemandNewLongitudinalState {
  demandCatalogs: DemandCatalogsDTO | null = null;

  episodeTypes: DemandCatalogItem[] = [];
  eventTypes: DemandCatalogItem[] = [];
  attendanceStatuses: DemandCatalogItem[] = [];
  citationTypes: DemandCatalogItem[] = [];
  biopsychosocialCommitmentLevels: DemandCatalogItem[] = [];
  closureReasons: DemandCatalogItem[] = [];
  programPopulations: DemandCatalogItem[] = [];
  programModalities: DemandCatalogItem[] = [];
  programPlans: DemandCatalogItem[] = [];
  regions: DemandCatalogItem[] = [];
  cities: DemandCatalogItem[] = [];

  isLoadingDemandCatalogs = false;
  demandCatalogsError = '';
}
