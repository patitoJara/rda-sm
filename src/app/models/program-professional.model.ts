export interface ProgramProfessionalProgram {
  id: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface ProgramProfessional {
  id: number;
  name: string;

  professionId: number | null;
  professionCode?: string | null;
  professionName?: string | null;

  email?: string | null;
  phone?: string | null;
  observation?: string | null;

  active?: boolean | null;

  programIds: number[];
  programs?: ProgramProfessionalProgram[];

  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface ProgramProfessionalPayload {
  name: string;
  professionId: number;
  email?: string | null;
  phone?: string | null;
  observation?: string | null;
  active?: boolean | null;
  programIds: number[];
}

export interface ProgramProfessionalPage {
  content: ProgramProfessional[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}