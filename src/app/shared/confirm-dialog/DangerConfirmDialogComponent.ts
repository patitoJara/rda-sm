import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DangerConfirmData {
  title?: string;
  message: string;
  confirmText?: string;   // ej: "Eliminar definitivamente"
  cancelText?: string;    // ej: "Cancelar"
  icon?: string;          // ej: 'warning', 'delete_forever'
  dense?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-danger-confirm-dialog',
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
        {{ data.icon || 'warning' }}
      </mat-icon>

      {{ data.title || 'Confirmación requerida' }}
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
        color="warn"
        type="button"
        cdkFocusInitial
        (click)="onConfirm()"
        (keydown.enter)="onConfirm()"
      >
        {{ data.confirmText || 'Continuar' }}
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
export class DangerConfirmDialogComponent {
  constructor(
    private ref: MatDialogRef<DangerConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: DangerConfirmData
  ) {}

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}


/* ejemplo para usar


import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';


    this.dialog.open(DangerConfirmDialogComponent, {
    width: '460px',
    disableClose: true,
    data: {
        title: 'Eliminar definitivamente',
        message:
        '⚠️ Esta acción es irreversible.\n\nEl registro será eliminado de forma permanente.',
        confirmText: 'Eliminar definitivamente',
        cancelText: 'Cancelar',
        icon: 'delete_forever',
    },
    }).afterClosed().subscribe(ok => {
    if (ok) {
        // 🔥 acción irreversible aquí
    }
    });

*/