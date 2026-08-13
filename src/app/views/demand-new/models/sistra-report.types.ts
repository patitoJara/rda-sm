export interface SistraReportPersonData {
  names: string;
  surnames: string;
  rut: string;
  birthDate: string | null;
  age: number | null;
  commune: string;
  phone: string;
  sex: string;
  address: string;
  cesfam: string;
}

export interface SistraReportDemandData {
  primarySubstance: string | null;
  secondarySubstances: string | null;
  previousTreatmentNumber: number | null;
  requestDate: string | null;
  contactType: string | null;
  sender: string | null;
  diverter: string | null;
}

export interface SistraReportFirstCitationData {
  date: string | null;
  time: string | null;
  professional: string | null;
}

export interface SistraReportData {
  person: SistraReportPersonData;
  demand: SistraReportDemandData;
  firstCitation: SistraReportFirstCitationData;
}