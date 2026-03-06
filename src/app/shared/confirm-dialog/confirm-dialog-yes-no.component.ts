// src/app/shared/confirm-dialog/confirm-dialog-yes-no.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogYesNoData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
}

@Component({
  standalone: true,
  selector: 'app-confirm-dialog-yes-no',
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

      {{ data.title }}
    </h2>

    <mat-dialog-content>
      <p class="dialog-message">
        {{ data.message }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">
        {{ data.cancelText || 'Cancelar' }}
      </button>

      <button
        mat-flat-button
        [color]="effectiveColor"
        cdkFocusInitial
        (click)="confirm()"
      >
        {{ data.confirmText || 'Confirmar' }}
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

      /* Opcional: puedes personalizar colores si quieres override visual */

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
export class ConfirmDialogYesNoComponent {
  constructor(
    private ref: MatDialogRef<ConfirmDialogYesNoComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogYesNoData
  ) {}

  get effectiveColor(): 'primary' | 'accent' | 'warn' {
    return this.data?.color ?? 'warn';
  }

  cancel(): void {
    this.ref.close(false);
  }

  confirm(): void {
    this.ref.close(true);
  }
}