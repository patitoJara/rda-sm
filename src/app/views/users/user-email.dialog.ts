import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-user-email-dialog', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Modificar correo electrónico</h2>
    <mat-dialog-content>
      <p>Cuenta: {{ data.username }}</p>
      <p>Esta acción no modifica la contraseña ni las asignaciones de roles y programas.</p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Correo electrónico</mat-label>
        <input matInput type="email" autocomplete="off" [formControl]="email" />
        <mat-error *ngIf="email.invalid">Ingresa un correo válido.</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="email.invalid || !email.dirty" (click)="confirm()">Actualizar correo</button>
    </mat-dialog-actions>`,
})
export class UserEmailDialogComponent {
  readonly email: FormControl<string>;
  constructor(public ref: MatDialogRef<UserEmailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string; username: string }) {
    this.email = new FormControl(data.email, { nonNullable: true, validators: [Validators.required, Validators.email] });
  }
  confirm(): void {
    if (this.email.invalid) return;
    this.ref.close(this.email.value.trim().toLowerCase());
  }
}
