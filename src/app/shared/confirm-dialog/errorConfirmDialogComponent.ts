import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ErrorConfirmData {
  title?: string;
  message: string;
  confirmText?: string;   // default: 'Aceptar'
  icon?: string;          // ej: 'error', 'warning'
  dense?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-error-confirm-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2
      mat-dialog-title
      class="dialog-title dialog-title-warn"
    >
      <mat-icon
        class="dialog-icon"
        color="warn"
      >
        {{ data.icon || 'error' }}
      </mat-icon>

      {{ data.title || 'Error' }}
    </h2>

    <mat-dialog-content [style.padding.px]="data.dense ? 8 : 16">
      <p class="dialog-message">
        {{ data.message }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" [style.padding.px]="data.dense ? 8 : 16">
      <button
        mat-flat-button
        color="warn"
        type="button"
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
        font-weight: 600;
      }

      .dialog-title-warn {
        color: #f44336; /* usa warn del theme */
      }

      .dialog-icon {
        opacity: 0.95;
      }

      .dialog-message {
        margin: 0;
        white-space: pre-wrap;
        font-weight: 500;
      }
    `,
  ],
})
export class ErrorConfirmDialogComponent {
  constructor(
    private ref: MatDialogRef<ErrorConfirmDialogComponent, true>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorConfirmData
  ) {}

  onConfirm(): void {
    this.ref.close(true);
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