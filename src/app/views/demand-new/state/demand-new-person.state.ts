import { Contact } from '@app/models/contact';
import { Postulant } from '@app/models/postulant';

export abstract class DemandNewPersonState {
  showDemandantDetails = false;

  isSearching = false;
  isSavingPerson = false;
  searched = false;
  personNotFound = false;

  selectedPerson: Postulant | null = null;
  selectedContact: Contact | null = null;

  searchError: string | null = null;
  personSaveError: string | null = null;

  showCreatePersonForm = false;
}
