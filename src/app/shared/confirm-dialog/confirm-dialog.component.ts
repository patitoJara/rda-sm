// src/app/shared/confirm-dialog/confirm-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Diálogo de confirmación estándar (Aceptar / Cancelar)
 * Uso: acciones importantes pero reversibles
 */
export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string; // default: 'Aceptar'
  cancelText?: string; // default: 'Cancelar'
  color?: 'primary' | 'accent' | 'warn';
  icon?: string; // ej: 'delete', 'warning', 'info'
  dense?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-confirm-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2
      mat-dialog-title
      class="dialog-title"
      [ngClass]="'dialog-title-' + effectiveColor"
    >
      <mat-icon *ngIf="data.icon" class="dialog-icon" [color]="effectiveColor">
        {{ data.icon }}
      </mat-icon>

      {{ data.title || 'Confirmar acción' }}
    </h2>

    <mat-dialog-content [style.padding.px]="data.dense ? 8 : 16">
      <p class="dialog-message">
        {{ data.message }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" [style.padding.px]="data.dense ? 8 : 16">
      <button mat-stroked-button type="button" (click)="onCancel()">
        {{ data.cancelText || 'Cancelar' }}
      </button>

      <button
        mat-flat-button
        type="button"
        [color]="effectiveColor"
        [class.confirm-warn]="effectiveColor === 'warn'"
        cdkFocusInitial
        (click)="onConfirm()"
        (keydown.enter)="onConfirm()"
      >
        {{ data.confirmText || 'Aceptar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 800;
        margin: 0;
      }

      .dialog-icon {
        opacity: 0.95;
      }

      .dialog-message {
        margin: 0;
        white-space: pre-wrap;
        color: #4b6268;
        font-weight: 500;
      }

      mat-dialog-actions {
        gap: 10px;
      }

      button {
        border-radius: 999px !important;
        font-weight: 800 !important;
      }

      /* Clases dinámicas por color */

      .dialog-title-primary {
        color: #0f6b75;
      }

      .dialog-title-accent {
        color: #7c3aed;
      }

      .dialog-title-warn {
        color: #dc2626;
      }

      .dialog-title-warn .dialog-icon {
        color: #dc2626 !important;
      }

      /* Botón confirmar en modo warn */
      button.mat-warn,
      button[color='warn'] {
        background: #dc2626 !important;
        color: #ffffff !important;
      }

      button.mat-warn:hover,
      button[color='warn']:hover {
        background: #b91c1c !important;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    private ref: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  get effectiveColor(): 'primary' | 'accent' | 'warn' {
    return this.data?.color ?? 'primary';
  }

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}

/* ejemplo de uso 

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';

export class xxxxxxxxx implements OnInit {
  private dialog = inject(MatDialog);


  this.dialog.open(ConfirmDialogOkComponent, {
    width: '420px',
    disableClose: true,
    data: {
          title: 'Error en contraseñas',
          message: 'Las contraseñas no coinciden.',
          icon: 'check_circle',
          color: 'primary',
          confirmText: 'Aceptar',
  });


*/
