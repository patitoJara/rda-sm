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

  currentStageId: number | null;
  currentStageStateCode: string | null;
  currentStageResultCode: string | null;
  currentStageReceivedAt: string | null;
  currentStageDays: number | null;

  originProgramId: number | null;
  originProgramName: string | null;
  referenceCount: number;

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
  firstCitationThirdInterviewDate: string | null;
  secondCitationThirdInterviewDate: string | null;
  optionalInterviewDate: string | null;

  feedbackDate: string | null;
  closureDate: string | null;

  biopsychosocialCommitmentCode: string | null;

  createdByUser: {
    id: number;
    name: string;
    email: string;
  } | null;

  suggestedAction: string | null;
}

export interface PrioritizedEpisodeStageDTO {
  episodeId: number;
  episodeCode: string;
  rut: string;
  personName: string;

  createdByUser: {
    id: number;
    name: string;
    email: string;
  } | null;

  currentProgram: DemandProgramSummaryDTO | null;
  currentStageId: number | null;

  program: DemandProgramSummaryDTO | null;
  programId: number;
  programName: string;

  stageId: number;
  stageOrder: number;
  originStageId: number | null;

  receivedAt: string | null;
  closedAt: string | null;
  closureDate: string | null;
  daysInStage: number;

  stageStateCode: string | null;
  stageResultCode: string | null;

  closed: boolean;
  current: boolean;

  closureReason: {
    id: number;
    code: string;
    name: string;
  } | null;

  closureComment: string | null;

  responsibleUser: {
    id: number;
    name: string;
    email: string;
  } | null;

  originalRequestDate: string;
  accumulatedDays: number;
  semaphoreColor: string;

  lastManagement: string | null;
  lastManagementDate: string | null;
  lastManagementTime: string | null;

  firstCitationFirstInterviewDate: string | null;
  secondCitationFirstInterviewDate: string | null;
  firstCitationSecondInterviewDate: string | null;
  secondCitationSecondInterviewDate: string | null;
  firstCitationThirdInterviewDate: string | null;
  secondCitationThirdInterviewDate: string | null;
  optionalInterviewDate: string | null;

  feedbackDate: string | null;
  feedbackResultCode: string | null;
  biopsychosocialCommitmentCode: string | null;

  suggestedAction: string | null;

  events: any[];
}
export interface DemandEpisodeProgramContextDTO {
  episodeId: number;
  programId: number;
  programName: string;
  stageId: number;
  stageStateCode: string;
  stageResultCode: string;
  receivedAt: string;
  closureDate: string | null;
  closed: boolean;
}

export interface DemandEpisodeProgramContextsRequest {
  programId: number;
  episodeIds: number[];
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

export interface SupervisorProgramDashboardDTO {
  programId: number;
  programName: string;
  activeDemands: number;
  averageAccumulatedDays: number;
  redCases: number;
  withoutFirstCitation: number;
  withoutFeedback: number;
  severeCommitmentCases: number;
  pendingReferences: number;
  pendingClosures: number;
  openAlerts: number;
}

export interface ReferenceReasonDTO {
  reason: string;
  count: number;
}

export interface SupervisorProgramReferenceDTO {
  programId: number;
  programName: string;

  receivedReferences: number;
  sentReferences: number;
  pendingReferences: number;
  referenceBalance: number;

  averageDaysBeforeReference: number;
  referenceReasons: ReferenceReasonDTO[];
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


  search?: string | null;
  sort?: string | null;
}
