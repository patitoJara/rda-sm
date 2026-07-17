export interface Result {
  id?: number;

  name: string;
  code: string;
  scope: string;
  description?: string | null;
  active: boolean;

  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}