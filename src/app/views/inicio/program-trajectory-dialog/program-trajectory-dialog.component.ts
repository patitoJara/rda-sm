import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatProgressSpinnerModule,
} from '@angular/material/progress-spinner';

import { finalize } from 'rxjs';

import {
  DemandService,
} from '../../../core/services/demand.service';

export interface ProgramTrajectoryDialogData {
  rut: string;
  episodeCode: string;
  personName: string;
}

interface ProgramBrief {
  id: number;
  name: string;
}

interface ProgramStage {
  id: number;
  stageOrder: number;
  program: ProgramBrief;
  originStageId: number | null;
  receivedAt: string | null;
  closedAt: string | null;
  stateCode: string | null;
  resultCode: string | null;
  current: boolean;
  daysInStage: number;
}

interface ProgramReference {
  id: number;
  originStageId: number;
  destinationStageId: number;
  originProgram: ProgramBrief;
  destinationProgram: ProgramBrief;
  referenceDate: string | null;
  reason: string | null;
  observation: string | null;
}

interface LongitudinalTrajectoryResponse {
  stages?: ProgramStage[];
  references?: ProgramReference[];
}

@Component({
  standalone: true,
  selector: 'app-program-trajectory-dialog',
  templateUrl: './program-trajectory-dialog.component.html',
  styleUrls: ['./program-trajectory-dialog.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class ProgramTrajectoryDialogComponent
  implements OnInit {
  readonly data: ProgramTrajectoryDialogData =
    inject(MAT_DIALOG_DATA);

  private readonly demandService =
    inject(DemandService);

  loading = false;
  error: string | null = null;

  stages: ProgramStage[] = [];
  references: ProgramReference[] = [];

  ngOnInit(): void {
    this.loadTrajectory();
  }

  loadTrajectory(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.demandService
      .getLongitudinalByRut(this.data.rut)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (response: LongitudinalTrajectoryResponse) => {
          this.stages = [...(response.stages ?? [])]
            .sort(
              (left, right) =>
                left.stageOrder - right.stageOrder,
            );

          this.references = [
            ...(response.references ?? []),
          ].sort(
            (left, right) =>
              left.originStageId - right.originStageId,
          );
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            '[ProgramTrajectoryDialog] Error:',
            error,
          );

          this.stages = [];
          this.references = [];

          this.error =
            error.status === 403
              ? 'No tiene permisos para consultar la trayectoria.'
              : 'No fue posible cargar la trayectoria por programas.';
        },
      });
  }

  getReferenceAfterStage(
    stageId: number,
  ): ProgramReference | null {
    return (
      this.references.find(
        (reference) =>
          Number(reference.originStageId) ===
          Number(stageId),
      ) ?? null
    );
  }

  getCodeLabel(value: string | null): string {
    const code = String(value ?? '')
      .trim()
      .toUpperCase();

    const labels: Record<string, string> = {
      EN_TRAMITE: 'En trámite',
      CERRADO: 'Cerrada',
      AUN_SIN_RESULTADO: 'Aún sin resultado',
      REFERENCIA: 'Referencia',
      LISTA_ESPERA: 'Lista de espera',
      INGRESO_TRATAMIENTO: 'Ingreso a tratamiento',
      EGRESO: 'Egreso',
      ABANDONO: 'Abandono',
      NO_ES_PERFIL: 'No es perfil',
      NO_CORRESPONDE: 'No corresponde',
    };

    if (!code) {
      return 'Sin información';
    }

    return (
      labels[code] ??
      code
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^\p{L}/u, (letter) =>
          letter.toUpperCase(),
        )
    );
  }

  trackByStageId(
    _index: number,
    stage: ProgramStage,
  ): number {
    return stage.id;
  }
}