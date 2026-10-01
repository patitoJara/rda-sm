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

  printAnalysis(): void {
    if (this.loading || this.programs.length === 0) {
      return;
    }

    const logoUrl =
      `${window.location.origin}/assets/logoSSM.png`;

    const updatedAt =
      this.updatedAt ?? new Date();

    const updatedText =
      new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(updatedAt);

    const focus = this.focusProgram;

    const programRows = this.programs
      .map((program) => `
        <tr>
          <td>
            <span class="level level-${program.supervisionLevel.toLowerCase()}">
              ${this.escapeHtml(program.supervisionLabel)}
            </span>
          </td>

          <td class="program-name">
            <strong>${this.escapeHtml(program.programName)}</strong>
            <small>
              ${program.pendingActions}
              ${program.pendingActions === 1
                ? 'hito pendiente'
                : 'hitos pendientes'}
            </small>
          </td>

          <td class="numeric">${program.activeDemands}</td>

          <td class="numeric">
            ${Number(program.averageAccumulatedDays ?? 0).toFixed(1)} d
          </td>

          <td class="numeric ${program.redCases > 0 ? 'value-alert' : ''}">
            ${program.redCases}
          </td>

          <td class="numeric ${program.withoutFirstCitation > 0 ? 'value-warning' : ''}">
            ${program.withoutFirstCitation}
          </td>

          <td class="numeric ${program.withoutFeedback > 0 ? 'value-warning' : ''}">
            ${program.withoutFeedback}
          </td>

          <td class="numeric ${program.severeCommitmentCases > 0 ? 'value-alert' : ''}">
            ${program.severeCommitmentCases}
          </td>

          <td class="numeric ${program.pendingReferences > 0 ? 'value-warning' : ''}">
            ${program.pendingReferences}
          </td>

          <td class="numeric ${program.pendingClosures > 0 ? 'value-warning' : ''}">
            ${program.pendingClosures}
          </td>

          <td class="numeric ${program.openAlerts > 0 ? 'value-alert' : ''}">
            ${program.openAlerts}
          </td>

          <td class="action">
            ${this.escapeHtml(program.suggestedAction)}
          </td>
        </tr>
      `)
      .join('');

    const referenceRows = this.programs
      .map((program) => {
        const summary = program.referenceSummary;

        const reasons =
          summary.referenceReasons.length > 0
            ? summary.referenceReasons
                .map(
                  (reason) =>
                    `<span class="reason">
                      ${this.escapeHtml(reason.reason)}
                      <strong>${reason.count}</strong>
                    </span>`,
                )
                .join('')
            : '<span class="empty">—</span>';

        return `
          <tr>
            <td class="program-name">
              <strong>${this.escapeHtml(program.programName)}</strong>
              <small>Indicadores del mes actual</small>
            </td>

            <td class="numeric">
              ${summary.receivedReferences}
            </td>

            <td class="numeric">
              ${summary.sentReferences}
            </td>

            <td class="numeric ${summary.pendingReferences > 0 ? 'value-warning' : ''}">
              ${summary.pendingReferences}
            </td>

            <td class="numeric">
              ${summary.referenceBalance}
            </td>

            <td class="numeric">
              ${Number(summary.averageDaysBeforeReference ?? 0).toFixed(1)} d
            </td>

            <td>
              <div class="reasons">
                ${reasons}
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    const focusReasons =
      focus?.attentionReasons
        .map(
          (reason) =>
            `<li>${this.escapeHtml(reason)}</li>`,
        )
        .join('') ?? '';

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">

          <title>Análisis por programa</title>

          <style>
            @page {
              size: Letter landscape;
              margin: 7mm 9mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
            }

            body {
              color: #263940;
              font-family: Roboto, Arial, sans-serif;
              font-size: 8px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .report-header {
              display: grid;
              grid-template-columns: 110px 1fr auto;
              align-items: center;
              gap: 14px;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 3px solid #087f91;
            }

            .report-logo {
              max-width: 105px;
              max-height: 58px;
              object-fit: contain;
            }

            .report-title small {
              display: block;
              margin-bottom: 2px;
              color: #08778a;
              font-size: 7px;
              font-weight: 800;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .report-title h1 {
              margin: 0;
              color: #263940;
              font-size: 18px;
              line-height: 1.1;
            }

            .report-title p {
              margin: 3px 0 0;
              color: #60727b;
              font-size: 8px;
            }

            .report-date {
              color: #60727b;
              font-size: 7px;
              text-align: right;
            }

            .metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 7px;
              margin-bottom: 4px;
            }

            .metric {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              padding: 6px 9px;
              border: 1px solid #dce5e9;
              border-radius: 7px;
              background: #f8fafb;
            }

            .metric small {
              display: block;
              color: #415861;
              font-size: 8.5px;
              font-weight: 700;
              line-height: 1.1;
            }

            .metric strong {
              display: block;
              margin: 0;
              color: #20313a;
              font-size: 11px;
              font-weight: 800;
              line-height: 1;
              white-space: nowrap;
            }

            .focus {
              display: grid;
              grid-template-columns: 1.55fr .8fr;
              margin-bottom: 4px;
              overflow: hidden;
              border: 1px solid #d7e3e7;
              border-left: 4px solid #c62c2c;
              border-radius: 8px;
            }

            .focus-main {
              padding: 8px 10px;
            }

            .focus-main small,
            .focus-reasons > strong {
              display: block;
              color: #08778a;
              font-size: 7px;
              font-weight: 800;
              letter-spacing: .06em;
              text-transform: uppercase;
            }

            .focus-main h2 {
              margin: 3px 0;
              font-size: 13px;
            }

            .focus-main p {
              margin: 3px 0 0;
              font-size: 8px;
            }

            .focus-reasons {
              padding: 8px 10px;
              border-left: 1px solid #e2eaed;
              background: #f8fafb;
            }

            .focus-reasons ul {
              margin: 4px 0 0;
              padding-left: 14px;
            }

            .focus-reasons li {
              margin-bottom: 2px;
              font-size: 7px;
            }

            .section {
              margin-top: 5px;
            }

            .section-heading {
              display: flex;
              align-items: end;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 4px;
            }

            .section-heading small {
              display: block;
              color: #08778a;
              font-size: 6.5px;
              font-weight: 800;
              letter-spacing: .07em;
            }

            .section-heading h2 {
              margin: 1px 0 0;
              font-size: 11px;
            }

            .section-heading p {
              max-width: 370px;
              margin: 0;
              color: #71828a;
              font-size: 6.5px;
              text-align: right;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
            }

            thead {
              display: table-header-group;
            }

            tr {
              break-inside: avoid;
            }

            th {
              padding: 3px 4px;
              color: #354b54;
              border: 1px solid #cfdde2;
              background: #e6f2f5;
              font-size: 8px;
              font-weight: 800;
              line-height: 1.08;
              text-align: left;
              white-space: nowrap;
            }

            td {
              padding: 3px 4px;
              color: #2f444d;
              border: 1px solid #dfe7ea;
              font-size: 8px;
              line-height: 1.12;
              vertical-align: middle;
            }

            .numeric {
              color: #263940;
              font-weight: 650;
              text-align: center;
              white-space: nowrap;
            }

            .program-name {
              min-width: 90px;
            }

            .program-name strong {
              display: block;
              color: #20313a;
              font-size: 8px;
              font-weight: 800;
              line-height: 1.1;
            }

            .program-name small {
              display: block;
              margin-top: 1px;
              color: #60727b;
              font-size: 7.2px;
              font-weight: 600;
              line-height: 1.05;
            }

            .action {
              min-width: 145px;
            }

            .value-alert {
              color: #bd2929;
              font-weight: 800;
              background: #fff2f2;
            }

            .value-warning {
              color: #946000;
              font-weight: 800;
              background: #fff9e9;
            }

            .level {
              display: inline-block;
              padding: 3px 5px;
              border: 1px solid transparent;
              border-radius: 20px;
              font-size: 6px;
              font-weight: 800;
              white-space: nowrap;
            }

            .level-critico {
              color: #ad2020;
              border-color: #efb2b2;
              background: #ffeded;
            }

            .level-alto {
              color: #9a5800;
              border-color: #efc885;
              background: #fff3db;
            }

            .level-atencion {
              color: #826500;
              border-color: #e7d48c;
              background: #fff9df;
            }

            .level-normal {
              color: #117044;
              border-color: #a9ddc4;
              background: #eaf8f1;
            }

            .reference-summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 7px;
              margin-bottom: 3px;
            }

            .reference-summary > div {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              padding: 6px 9px;
              border: 1px solid #dde7ea;
              border-radius: 6px;
              background: #f8fafb;
            }

            .reference-summary small {
              display: block;
              color: #415861;
              font-size: 8.5px;
              font-weight: 700;
              line-height: 1.1;
              text-transform: uppercase;
            }

            .reference-summary strong {
              display: block;
              margin: 0;
              color: #20313a;
              font-size: 11px;
              font-weight: 800;
              line-height: 1;
              white-space: nowrap;
            }

            .reasons {
              display: flex;
              flex-wrap: wrap;
              gap: 2px;
            }

            .reason {
              display: inline-flex;
              align-items: center;
              gap: 3px;
              padding: 2px 4px;
              border: 1px solid #d8e4e8;
              border-radius: 12px;
              background: #f5f9fa;
              font-size: 5.7px;
            }

            .reason strong {
              display: inline-block;
              min-width: 13px;
              padding: 1px 3px;
              color: #ffffff;
              border-radius: 10px;
              background: #08778a;
              text-align: center;
            }

            .empty {
              color: #8a9aa0;
            }

            .report-footer {
              margin-top: 3px;
              padding-top: 2px;
              color: #71828a;
              border-top: 1px solid #d7e2e6;
              font-size: 6px;
              text-align: right;
            }
          </style>
        </head>

        <body>
          <header class="report-header">
            <img
              src="${logoUrl}"
              class="report-logo"
              alt="Servicio de Salud Magallanes"
            />

            <div class="report-title">
              <small>Servicio de Salud Magallanes · Salud Mental</small>

              <h1>Análisis por programa</h1>

              <p>
                Control ejecutivo de demanda para orientar la supervisión
                y priorizar decisiones.
              </p>
            </div>

            <div class="report-date">
              <strong>Actualizado</strong><br />
              ${this.escapeHtml(updatedText)}
            </div>
          </header>

          <section class="metrics">
            <div class="metric">
              <small>Programas con atención</small>
              <strong>
                ${this.programsNeedingAttention}
                de ${this.programs.length}
              </strong>
            </div>

            <div class="metric">
              <small>Demandas activas</small>
              <strong>${this.totalActiveDemands}</strong>
            </div>

            <div class="metric">
              <small>Indicadores críticos</small>
              <strong>${this.totalCriticalIndicators}</strong>
            </div>

            <div class="metric">
              <small>Hitos pendientes</small>
              <strong>${this.totalPendingActions}</strong>
            </div>
          </section>

          ${
            focus
              ? `
                <section class="focus">
                  <div class="focus-main">
                    <small>Foco recomendado de supervisión</small>

                    <h2>${this.escapeHtml(focus.programName)}</h2>

                    <p>
                      <strong>Acción sugerida:</strong>
                      ${this.escapeHtml(focus.suggestedAction)}
                    </p>
                  </div>

                  <div class="focus-reasons">
                    <strong>Factores considerados</strong>

                    <ul>
                      ${focusReasons}
                    </ul>
                  </div>
                </section>
              `
              : ''
          }

          <section class="section">
            <div class="section-heading">
              <div>
                <small>COMPARACIÓN OPERATIVA</small>
                <h2>Prioridad de supervisión por programa</h2>
              </div>

              <p>
                El orden considera condiciones críticas, complejidad y
                gestiones pendientes. No constituye una evaluación de desempeño.
              </p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Prioridad</th>
                  <th>Programa</th>
                  <th>Activas</th>
                  <th>Promedio</th>
                  <th>Rojos</th>
                  <th>Sin C1</th>
                  <th>Sin retro.</th>
                  <th>Severo</th>
                  <th>Referencias</th>
                  <th>Cierres</th>
                  <th>Alertas</th>
                  <th>Acción prioritaria</th>
                </tr>
              </thead>

              <tbody>
                ${programRows}
              </tbody>
            </table>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <small>REFERENCIAS DEL MES</small>
                <h2>Movimiento y oportunidad entre programas</h2>
              </div>

              <p>
                El promedio y los motivos corresponden al programa que
                realizó la referencia.
              </p>
            </div>

            <div class="reference-summary">
              <div>
                <small>Recibidas</small>
                <strong>${this.totalReceivedReferences}</strong>
              </div>

              <div>
                <small>Enviadas</small>
                <strong>${this.totalSentReferences}</strong>
              </div>

              <div>
                <small>Pendientes</small>
                <strong>${this.totalPendingReferences}</strong>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Recibidas</th>
                  <th>Enviadas</th>
                  <th>Pendientes</th>
                  <th>Balance</th>
                  <th>Promedio previo</th>
                  <th>Motivos de referencia</th>
                </tr>
              </thead>

              <tbody>
                ${referenceRows}
              </tbody>
            </table>
          </section>

          <footer class="report-footer">
            Servicio de Salud Magallanes · Sistema Gestión de Demanda
          </footer>
        </body>
      </html>
    `;

    this.printReportHtml(html);
  }

  private printReportHtml(html: string): void {
    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const doc = printWindow?.document;

    if (!printWindow || !doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const print = () => {
      printWindow.focus();
      printWindow.print();

      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    const logo = doc.querySelector('img');

    if (
      logo instanceof HTMLImageElement &&
      !logo.complete
    ) {
      logo.addEventListener(
        'load',
        print,
        { once: true },
      );

      logo.addEventListener(
        'error',
        print,
        { once: true },
      );

      return;
    }

    window.setTimeout(print, 150);
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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







