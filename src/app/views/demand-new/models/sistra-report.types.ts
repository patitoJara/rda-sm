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

export interface SistraReportCitationData {
  date: string | null;
  time: string | null;
  professional: string | null;
  profession: string | null;
  attendance: string | null;
}

export interface SistraReportFeedbackData {
  date: string | null;
  time: string | null;
  professional: string | null;
  commitment: string | null;
  result: string | null;
}

export interface SistraReportClosureData {
  date: string | null;
  reason: string | null;
  responsible: string | null;
}

export interface SistraReportData {
  person: SistraReportPersonData;
  demand: SistraReportDemandData;

  firstCitationFirstInterview: SistraReportCitationData;
  secondCitationFirstInterview: SistraReportCitationData;
  firstCitationSecondInterview: SistraReportCitationData;
  secondCitationSecondInterview: SistraReportCitationData;
  firstCitationThirdInterview: SistraReportCitationData;
  secondCitationThirdInterview: SistraReportCitationData;
  optionalInterview: SistraReportCitationData;

  feedback: SistraReportFeedbackData;
  closure: SistraReportClosureData;

  observations: string;
}