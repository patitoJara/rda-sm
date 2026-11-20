export interface PostulantCreateDto {
  user: { id: number };

  commune: { id: number };
  sex: { id: number };

  convPrev?: {
    id: number;
    intPrev: { id: number };
  };

  firstName: string | null;
  lastName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;

  rut: string;
  birthdate: string;

  email?: string | null;
  phone?: string | null;
  address?: string | null;
  suicideRiskFlag?: boolean | null;
}
