export interface DemandProgramSummaryDTO {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: any;
}

export interface PrioritizedEpisodeDTO {
  episodeId: number;
  episodeCode: string;
  rut: string;
  personName: string;

  currentProgram: DemandProgramSummaryDTO | null;

  originalRequestDate: string;
  accumulatedDays: number;
  semaphoreColor: string;

  stateCode: string;
  resultCode: string;

  lastManagement: string | null;
  lastManagementDate: string | null;
  lastManagementTime: string | null;

  firstCitationFirstInterviewDate: string | null;
  secondCitationFirstInterviewDate: string | null;
  firstCitationSecondInterviewDate: string | null;
  secondCitationSecondInterviewDate: string | null;
  optionalInterviewDate: string | null;

  feedbackDate: string | null;
  closureDate: string | null;

  biopsychosocialCommitmentCode: string | null;

  suggestedAction: string | null;
}

export interface PageSortDTO {
  sorted: boolean;
  empty: boolean;
  unsorted: boolean;
}

export interface PageableDTO {
  pageNumber: number;
  pageSize: number;
  offset: number;
  paged: boolean;
  unpaged: boolean;
  sort: PageSortDTO;
}

export interface PageDTO<T> {
  content: T[];
  pageable: PageableDTO;

  totalElements: number;
  totalPages: number;

  size: number;
  number: number;
  numberOfElements: number;

  first: boolean;
  last: boolean;
  empty: boolean;

  sort: PageSortDTO;
}

export interface SupervisorDashboardDTO {
  activeDemands: number;
  waitingList: number;
  averageAccumulatedDays: number;
  redCases: number;
  withoutFirstCitation: number;
  openAlerts: number;

  semaphoreDistribution: Record<string, number>;

  topCriticalCases: PrioritizedEpisodeDTO[];
}

export interface PrioritizedEpisodeQuery {
  page?: number;
  size?: number;

  programId?: number | null;
  stateCode?: string | null;
  resultCode?: string | null;

  sort?: string | null;
}