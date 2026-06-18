//C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\models\register-substance-create.dto.ts

export interface RegisterSubstanceCreateDto {
  register: { id: number };
  substance: { id: number };
  level: 'Principal' | 'Secundaria';
  order?: number;
}