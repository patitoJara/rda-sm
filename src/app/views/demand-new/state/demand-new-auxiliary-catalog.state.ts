import { DemandNewCatalogState } from './demand-new-catalog.state';

export abstract class DemandNewAuxiliaryCatalogState extends DemandNewCatalogState {
  sexes: any[] = [];
  communes: any[] = [];
  intPrev: any[] = [];
  convPrev: any[] = [];
  filteredConvPrev: any[] = [];

  substances: any[] = [];

  professions: any[] = [];
  results: any[] = [];
  contactTypes: any[] = [];
  senders: any[] = [];
  diverters: any[] = [];
}
