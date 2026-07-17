import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ErrorConfirmDialogComponent } from '../../shared/confirm-dialog/errorConfirmDialogComponent';


@Injectable({
  providedIn: 'root',
})
export class BackendStatusService {
  private readonly dialog = inject(MatDialog);

  /**
   * Evita abrir varios modales cuando fallan simultáneamente
   * distintas solicitudes HTTP.
   */
  private unavailableDialogOpen = false;

  showBackendUnavailable(): void {
    if (this.unavailableDialogOpen) {
      return;
    }

    this.unavailableDialogOpen = true;

    const dialogRef = this.dialog.open(ErrorConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Servicio temporalmente no disponible',
        message:
          'No fue posible comunicarse con el servidor.\n\n' +
          'Verifique su conexión de red o intente nuevamente en unos minutos.',
        icon: 'cloud_off',
        confirmText: 'Entendido',
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.unavailableDialogOpen = false;
    });
  }
}