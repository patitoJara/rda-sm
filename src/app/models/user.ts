// src/app/models/user.ts

import { Program } from './program';
import { Role } from './role';

export interface User {
  id: number | null;

  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;

  email: string | null;
  username: string | null;
  password?: string | null;
  rut: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;

  programs?: Program[];
  roles?: Role[];
}