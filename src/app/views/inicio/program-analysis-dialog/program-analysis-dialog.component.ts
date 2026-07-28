import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { finalize, forkJoin } from 'rxjs';

import {
  SupervisorProgramDashboardDTO,
  SupervisorProgramReferenceDTO,
} from '../../../core/models/demand-priority.models';
import { DemandService } from '../../../core/services/demand.service';

type SupervisionLevel =
  | 'CRITICO'
  | 'ALTO'
  | 'ATENCION'
  | 'NORMAL';

interface ProgramAnalysisRow extends SupervisorProgramDashboardDTO {
  referenceSummary: SupervisorProgramReferenceDTO;
  supervisionLevel: SupervisionLevel;
  supervisionLabel: string;
  priorityScore: number;
  pendingActions: number;
  suggestedAction: string;
  attentionReasons: string[];
}

@Component({
  standalone: true,
  selector: 'app-program-analysis-dialog',
  templateUrl: './program-analysis-dialog.component.html',
  styleUrls: ['./program-analysis-dialog.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class ProgramAnalysisDialogComponent implements OnInit {
  private readonly demandService = inject(DemandService);

  loading = false;
  error: string | null = null;
  programs: ProgramAnalysisRow[] = [];
  updatedAt: Date | null = null;

  ngOnInit(): void {
    this.loadAnalysis();
  }

  get focusProgram(): ProgramAnalysisRow | null {
    return this.programs[0] ?? null;
  }

  get programsNeedingAttention(): number {
    return this.programs.filter(
      (program) => program.supervisionLevel !== 'NORMAL',
    ).length;
  }

  get totalActiveDemands(): number {
    return this.sum('activeDemands');
  }

  get totalCriticalIndicators(): number {
    return (
      this.sum('redCases') +
      this.sum('openAlerts')
    );
  }

  get totalPendingActions(): number {
    return this.programs.reduce(
      (total, program) => total + program.pendingActions,
      0,
    );
  }

  get totalReceivedReferences(): number {
    return this.sumReference('receivedReferences');
  }

  get totalSentReferences(): number {
    return this.sumReference('sentReferences');
  }

  get totalPendingReferences(): number {
    return this.sumReference('pendingReferences');
  }

  loadAnalysis(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = null;

    forkJoin({
      programs:
        this.demandService.getSupervisorProgramsDashboard(),
      references:
        this.demandService.getSupervisorProgramsReferences(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: ({ programs, references }) => {
          const referencesByProgramId =
            new Map<number, SupervisorProgramReferenceDTO>();

          references.forEach((reference) => {
            referencesByProgramId.set(
              reference.programId,
              reference,
            );
          });

          this.programs = programs
            .map((program) =>
              this.buildAnalysis(
                program,
                referencesByProgramId.get(program.programId) ??
                  this.createEmptyReferenceSummary(program),
              ),
            )
            .sort((left, right) => {
              if (right.priorityScore !== left.priorityScore) {
                return right.priorityScore - left.priorityScore;
              }

              if (
                right.averageAccumulatedDays !==
                left.averageAccumulatedDays
              ) {
                return (
                  right.averageAccumulatedDays -
                  left.averageAccumulatedDays
                );
              }

              return left.programName.localeCompare(
                right.programName,
                'es',
              );
            });

          this.updatedAt = new Date();
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            '[ProgramAnalysisDialog] Error cargando análisis:',
            error,
          );

          this.programs = [];

          this.error =
            error.status === 403
              ? 'No tiene permisos para consultar el análisis por programa.'
              : 'No fue posible cargar el análisis por programa.';
        },
      });
  }

  trackByProgramId(
    _index: number,
    program: ProgramAnalysisRow,
  ): number {
    return program.programId;
  }

  getLevelIcon(level: SupervisionLevel): string {
    switch (level) {
      case 'CRITICO':
        return 'error';
      case 'ALTO':
        return 'warning';
      case 'ATENCION':
        return 'schedule';
      default:
        return 'check_circle';
    }
  }

  private buildAnalysis(
    program: SupervisorProgramDashboardDTO,
    referenceSummary: SupervisorProgramReferenceDTO,
  ): ProgramAnalysisRow {
    const analysisProgram: SupervisorProgramDashboardDTO = {
      ...program,
      pendingReferences:
        referenceSummary.pendingReferences,
    };

    const attentionReasons =
      this.buildAttentionReasons(analysisProgram);

    const supervisionLevel =
      this.resolveSupervisionLevel(analysisProgram);

    const pendingActions =
      analysisProgram.withoutFirstCitation +
      analysisProgram.withoutFeedback +
      analysisProgram.pendingReferences +
      analysisProgram.pendingClosures +
      analysisProgram.openAlerts;

    return {
      ...analysisProgram,
      referenceSummary,
      supervisionLevel,
      supervisionLabel:
        this.getSupervisionLabel(supervisionLevel),
      priorityScore:
        analysisProgram.redCases * 10 +
        analysisProgram.openAlerts * 10 +
        analysisProgram.severeCommitmentCases * 6 +
        analysisProgram.pendingClosures * 5 +
        analysisProgram.pendingReferences * 4 +
        analysisProgram.withoutFirstCitation * 3 +
        analysisProgram.withoutFeedback * 3,
      pendingActions,
      suggestedAction:
        this.resolveSuggestedAction(analysisProgram),
      attentionReasons,
    };
  }

  private createEmptyReferenceSummary(
    program: SupervisorProgramDashboardDTO,
  ): SupervisorProgramReferenceDTO {
    return {
      programId: program.programId,
      programName: program.programName,
      receivedReferences: 0,
      sentReferences: 0,
      pendingReferences: 0,
      referenceBalance: 0,
      averageDaysBeforeReference: 0,
      referenceReasons: [],
    };
  }

  private resolveSupervisionLevel(
    program: SupervisorProgramDashboardDTO,
  ): SupervisionLevel {
    if (
      program.redCases > 0 ||
      program.openAlerts > 0
    ) {
      return 'CRITICO';
    }

    if (
      program.severeCommitmentCases > 0 ||
      program.pendingClosures > 0 ||
      program.pendingReferences > 0
    ) {
      return 'ALTO';
    }

    if (
      program.withoutFirstCitation > 0 ||
      program.withoutFeedback > 0
    ) {
      return 'ATENCION';
    }

    return 'NORMAL';
  }

  private getSupervisionLabel(
    level: SupervisionLevel,
  ): string {
    switch (level) {
      case 'CRITICO':
        return 'Crítica';
      case 'ALTO':
        return 'Alta';
      case 'ATENCION':
        return 'Atención';
      default:
        return 'Normal';
    }
  }

  private resolveSuggestedAction(
    program: SupervisorProgramDashboardDTO,
  ): string {
    if (program.redCases > 0) {
      return 'Revisar los casos en rojo y definir responsables inmediatos.';
    }

    if (program.openAlerts > 0) {
      return 'Resolver las alertas abiertas y verificar sus próximas revisiones.';
    }

    if (program.severeCommitmentCases > 0) {
      return 'Supervisar los casos de compromiso severo y su plan de atención.';
    }

    if (program.pendingClosures > 0) {
      return 'Revisar y regularizar los cierres pendientes.';
    }

    if (program.pendingReferences > 0) {
      return 'Confirmar la recepción y continuidad de las referencias pendientes.';
    }

    if (program.withoutFirstCitation > 0) {
      return 'Gestionar la primera citación de las demandas pendientes.';
    }

    if (program.withoutFeedback > 0) {
      return 'Regularizar las retroalimentaciones pendientes.';
    }

    return 'Mantener el seguimiento operativo habitual.';
  }

  private buildAttentionReasons(
    program: SupervisorProgramDashboardDTO,
  ): string[] {
    const reasons: string[] = [];

    this.addReason(
      reasons,
      program.redCases,
      'caso en rojo',
      'casos en rojo',
    );
    this.addReason(
      reasons,
      program.openAlerts,
      'alerta abierta',
      'alertas abiertas',
    );
    this.addReason(
      reasons,
      program.severeCommitmentCases,
      'caso con compromiso severo',
      'casos con compromiso severo',
    );
    this.addReason(
      reasons,
      program.withoutFirstCitation,
      'demanda sin primera citación',
      'demandas sin primera citación',
    );
    this.addReason(
      reasons,
      program.withoutFeedback,
      'demanda sin retroalimentación',
      'demandas sin retroalimentación',
    );
    this.addReason(
      reasons,
      program.pendingReferences,
      'referencia pendiente',
      'referencias pendientes',
    );
    this.addReason(
      reasons,
      program.pendingClosures,
      'cierre pendiente',
      'cierres pendientes',
    );

    if (reasons.length === 0) {
      reasons.push(
        'Sin incidencias operativas registradas.',
      );
    }

    return reasons;
  }

  private addReason(
    reasons: string[],
    value: number,
    singular: string,
    plural: string,
  ): void {
    if (value <= 0) {
      return;
    }

    reasons.push(
      `${value} ${value === 1 ? singular : plural}`,
    );
  }

  private sumReference(
    field:
      | 'receivedReferences'
      | 'sentReferences'
      | 'pendingReferences',
  ): number {
    return this.programs.reduce(
      (total, program) =>
        total +
        Number(program.referenceSummary[field] ?? 0),
      0,
    );
  }

  private sum(
    field:
      | 'activeDemands'
      | 'redCases'
      | 'openAlerts',
  ): number {
    return this.programs.reduce(
      (total, program) =>
        total + Number(program[field] ?? 0),
      0,
    );
  }
}