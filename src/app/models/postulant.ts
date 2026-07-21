// src/app/models/postulant-create.dto.ts

import { User } from './user';

/*
 * Referencia de usuario utilizada en payloads.
 *
 * Permite enviar solamente:
 * user: { id: 27 }
 *
 * También permite recibir los datos completos del usuario
 * cuando el backend los incluye.
 */
export type PostulantUser = {
  id: number;
} & Partial<Omit<User, 'id'>>;

export interface Postulant {
  id?: number;

  /*
   * Usuario del sistema relacionado con el registro.
   * No corresponde necesariamente a la persona postulante.
   */
  user?: PostulantUser;

  commune?: {
    id: number;
    name?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
  };

  sex?: {
    id: number;
    name?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
  };

  convPrev?: {
    id: number;
    name?: string | null;

    intPrev: {
      id: number;
      name?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
      deletedAt?: string | null;
    };

    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
  };

  /*
   * Datos propios de la persona postulante.
   *
   * firstName      = primer nombre
   * lastName       = segundo nombre
   * firstLastName  = primer apellido
   * secondLastName = segundo apellido
   */
  firstName?: string | null;
  lastName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;

  rut?: string | null;
  birthdate?: string | null;

  email?: string | null;
  phone?: string | null;
  address?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

/*
 * Payload utilizado para crear o actualizar postulantes.
 */
export interface PostulantCreateDto {
  user: {
    id: number;
  };

  commune: {
    id: number;
  };

  sex: {
    id: number;
  };

  convPrev?: {
    id: number;

    intPrev: {
      id: number;
    };
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
}