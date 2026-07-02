export interface Program {
  id?: number | null;
  name: string;

  populationTypeId?: number | null;
  modalityId?: number | null;
  planId?: number | null;
  regionId?: number | null;
  cityId?: number | null;

  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;

  active?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;

  // Opcionales por si el backend después devuelve nombres relacionados
  populationTypeName?: string | null;
  modalityName?: string | null;
  planName?: string | null;
  regionName?: string | null;
  cityName?: string | null;
}