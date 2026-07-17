export interface State {
  id?: number;

  name: string;
  code: string;
  scope: string;
  description: string | null;
  active: boolean;

  createdAt?: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}