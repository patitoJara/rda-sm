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
  confirmText?: string;               // default: 'Aceptar'
  cancelText?: string;                // default: 'Cancelar'
  color?: 'primary' | 'accent' | 'warn';
  icon?: string;                      // ej: 'delete', 'warning', 'info'
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
      <mat-icon
        *ngIf="data.icon"
        class="dialog-icon"
        [color]="effectiveColor"
      >
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
      <button
        mat-stroked-button
        type="button"
        (click)="onCancel()"
      >
        {{ data.cancelText || 'Cancelar' }}
      </button>

      <button
        mat-flat-button
        type="button"
        [color]="effectiveColor"
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
        font-weight: 500;
      }

      .dialog-icon {
        opacity: 0.95;
      }

      .dialog-message {
        margin: 0;
        white-space: pre-wrap;
      }

      /* Clases dinámicas por color */

      .dialog-title-primary {
        color: var(--mdc-theme-primary, #3f51b5);
      }

      .dialog-title-accent {
        color: var(--mdc-theme-secondary, #ff4081);
      }

      .dialog-title-warn {
        color: #f44336;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    private ref: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
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