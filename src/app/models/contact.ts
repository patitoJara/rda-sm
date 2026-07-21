//C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\models\contact.ts

export interface ContactPostulantReference {
  id: number;
}

export interface Contact {
  id?: number;

  name?: string | null;
  description?: string | null;
  email?: string | null;
  cellphone?: string | null;

  /*
   * La API puede devolver la relación en cualquiera
   * de estas dos propiedades.
   */
  postulantId?: number | null;
  postulant?: ContactPostulantReference | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}