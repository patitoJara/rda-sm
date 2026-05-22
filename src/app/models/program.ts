export type UTT = 'ADOLESCENTE' | 'ADULTO';
export type ProgramType = 'RESIDENCIAL' | 'AMBULATORIO';

export interface Program {
  id: number;
  name: string;

  utt: UTT;
  type: ProgramType;

  c1: string | null;
  c2: string | null;

  address: string;
  cellphone: string;
  email: string;
  city: string;
  description: string;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}