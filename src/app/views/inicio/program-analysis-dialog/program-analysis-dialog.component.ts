import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  DestroyRef,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { catchError, finalize, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { loadHistory, stageResults, History, Movement } from './program-analysis-data';
import { InicioActiveMetricsService } from '../services/inicio-active-metrics.service';
import { InicioActiveMetrics } from '../utils/inicio-active-metrics.utils';
import { buildExecutiveReport, ExecutiveReport, ProgramReport } from './program-analysis-report';

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
    FormsModule,
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
  private allPrograms: ProgramAnalysisRow[] = [];
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeMetricsService = inject(InicioActiveMetricsService);
  year = 2026;
  month = 0;
  programId = 0;
  years = [2026];
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  history: History | null = null;
  historyError: string | null = null;
  private referenceLoadError: string | null = null;
  periodReferences: SupervisorProgramReferenceDTO[] = [];
  activeMetrics: InicioActiveMetrics | null = null;
  referencesLoading = false;
  private referenceRequest = 0;
  private activeRequest = 0;
  private activeLoadedProgramId: number | null = null;
  private historyRequest = 0;
  readonly limitation = '—: dato no disponible. Sin movimiento reciente: pendiente de definir ventana y eventos. La ausencia de actividad no acredita incumplimiento.';

  get programs(): ProgramAnalysisRow[] {
    return this.allPrograms.filter(p => !this.programId || p.programId === this.programId);
  }
  get programOptions(): ProgramAnalysisRow[] { return this.allPrograms; }
  get periodLabel(): string { return `${this.month ? this.months[this.month - 1] : 'Todos los meses'} · ${this.year}`; }
  get selectedProgramName(): string { return this.allPrograms.find(p => p.programId === this.programId)?.programName ?? 'Todos los programas'; }
  get referencesError(): string | null {
    if (this.referenceLoadError) return this.referenceLoadError;
    if (this.referencesLoading) return null;
    const expected = new Set(this.allPrograms.map(p => p.programId));
    const counts = new Map<number, number>();
    for (const row of this.periodReferences) counts.set(row.programId, (counts.get(row.programId) ?? 0) + 1);
    const issues: string[] = [];
    if ([...counts.keys()].some(id => !expected.has(id))) issues.push('programas fuera del ámbito del tablero');
    if ([...expected].some(id => !counts.has(id))) issues.push('programas del tablero sin información');
    if ([...counts.values()].some(count => count > 1)) issues.push('programas duplicados');
    return issues.length
      ? `Referencias no disponibles: ${issues.join('; ')}. Los indicadores se muestran como — hasta aclarar la cobertura. No se calculan totales parciales.`
      : null;
  }
  get references(): SupervisorProgramReferenceDTO[] {
    if (!this.referenceCoverage) return [];
    const expected = new Set(this.allPrograms.map(p => p.programId));
    return this.periodReferences.filter(row => expected.has(row.programId))
      .filter(row => !this.programId || row.programId === this.programId);
  }
  get referenceCoverage(): boolean {
    return !this.referencesLoading && !this.referencesError && this.programs.length > 0;
  }
  referenceTotal(field: 'receivedReferences' | 'sentReferences' | 'pendingReferences' | 'referenceBalance'): number | string {
    return this.referenceCoverage ? this.references.reduce((sum, r) => sum + r[field], 0) : '—';
  }
  get periodMovements(): Movement[] { return this.movements('closed'); }
  movements(kind: 'entered' | 'closed', programId = this.programId, month = this.month): Movement[] {
    return (this.history?.[kind] ?? []).filter(m => this.allPrograms.some(p => p.programId === m.programId) && m.year === this.year && (!month || m.month === month) && (!programId || m.programId === programId));
  }
  count(kind: 'entered' | 'closed', programId = this.programId, month = this.month): number | string {
    if (!this.history || !(kind === 'entered' ? this.history.entriesComplete : this.history.closuresComplete) || (month && this.isFuture(month))) return '—';
    return this.movements(kind, programId, month).length;
  }
  hasMovement(kind: 'entered' | 'closed', programId: number, month: number): boolean {
    const value = this.count(kind, programId, month);
    return typeof value === 'number' && value > 0;
  }
  get programsWithActivity(): number | string {
    if (!this.history?.entriesComplete || !this.history.closuresComplete || (this.month && this.isFuture(this.month))) return '—';
    return new Set([...this.movements('entered'), ...this.movements('closed')].map(m => m.programId)).size;
  }
  private get managementResults() {
    if (!this.history || (this.month && this.isFuture(this.month))) return null;
    return stageResults(this.history, this.year, this.month, this.programId,
      this.allPrograms.map(program => program.programId));
  }
  get closedStageCount(): number | string {
    return this.managementResults?.total ?? '\u2014';
  }
  resultCount(result: string): number | string {
    return this.managementResults?.count(result) ?? '\u2014';
  }
  get predominantResult(): string {
    const codes = this.managementResults?.predominant;
    if (!codes) return '\u2014';
    const labels: Record<string, string> = { INGRESO_TRATAMIENTO: 'Ingreso a tratamiento', REFERENCIA: 'Referencia', ABANDONO: 'Abandono' };
    return codes.length ? codes.map(code => labels[code] ?? code).join(' / ') : 'Sin etapas cerradas';
  }
  get cards(): { label: string; value: number | string; icon: string }[] {
    return [
      { label: 'Programas con actividad', value: this.programsWithActivity, icon: 'domain' },
      { label: 'Demandas activas · actuales', value: this.totalActiveDemands, icon: 'folder_open' },
      { label: 'Casos críticos · rojos actuales', value: this.sum('redCases'), icon: 'warning' },
      { label: 'Ingresadas · período', value: this.count('entered'), icon: 'add_circle' },
      { label: 'Cerradas · período', value: this.count('closed'), icon: 'check_circle' },
      { label: 'Sin movimiento reciente', value: '—', icon: 'event_busy' },
    ];
  }
  isFuture(month: number): boolean {
    const now = new Date();
    return this.year > now.getFullYear() || (this.year === now.getFullYear() && month > now.getMonth() + 1);
  }
  selectMonth(month: number, programId = this.programId): void {
    this.month = month; this.programId = programId; this.filterChanged();
  }
  selectProgram(programId: number): void { this.programId = programId; this.loadActiveMetrics(); }
  resetFilters(): void { this.year = 2026; this.month = 0; this.programId = 0; this.filterChanged(); }
  filterChanged(): void { this.loadPeriodReferences(); this.loadActiveMetrics(); }
  private loadActiveMetrics(): void {
    if (this.activeLoadedProgramId === this.programId) return;
    this.activeLoadedProgramId = this.programId;
    const request = ++this.activeRequest;
    this.activeMetrics = null;
    this.activeMetricsService.load({ programId: this.programId || null, resultCode: null, search: '' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: metrics => { if (request === this.activeRequest) this.activeMetrics = metrics; },
        error: () => { if (request === this.activeRequest) { this.activeMetrics = null; this.activeLoadedProgramId = null; } },
      });
  }
  private loadPeriodReferences(): void {
    const request = ++this.referenceRequest;
    this.referencesLoading = true; this.referenceLoadError = null; this.periodReferences = [];
    const first = this.month || 1, last = this.month || 12;
    const from = `${this.year}-${String(first).padStart(2, '0')}-01`;
    const to = `${this.year}-${String(last).padStart(2, '0')}-${new Date(this.year, last, 0).getDate()}`;
    this.demandService.getSupervisorProgramsReferences(from, to).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { if (request === this.referenceRequest) { this.periodReferences = rows; this.referencesLoading = false; } },
      error: () => { if (request === this.referenceRequest) { this.referenceLoadError = 'No fue posible consultar las referencias del período.'; this.referencesLoading = false; } },
    });
  }
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

    const historyRequest = ++this.historyRequest;
    this.activeLoadedProgramId = null;
    this.history = null;
    this.historyError = null;
    forkJoin({
      programs: this.demandService.getSupervisorProgramsDashboard(),
      references: this.demandService.getSupervisorProgramsReferences().pipe(catchError(() => of([] as SupervisorProgramReferenceDTO[]))),
    }).pipe(finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ programs, references }) => {
        this.allPrograms = programs.map(program => this.buildAnalysis(program,
          references.find(r => r.programId === program.programId) ?? { ...this.createEmptyReferenceSummary(program), pendingReferences: program.pendingReferences }))
          .sort((a, b) => b.priorityScore - a.priorityScore || b.averageAccumulatedDays - a.averageAccumulatedDays || a.programName.localeCompare(b.programName, 'es'));
        this.updatedAt = new Date();
        if (!this.allPrograms.some(p => p.programId === this.programId)) this.programId = 0;
        this.filterChanged();
        loadHistory(this.demandService).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (history) => {
            if (historyRequest !== this.historyRequest) return;
            try {
              this.history = history;
              this.years = [...new Set([2026, ...this.history.entered.map(m => m.year), ...this.history.closed.map(m => m.year), ...this.history.closedStages.map(m => m.year)])].sort((a, b) => b - a);
              if (!this.history.entriesComplete || !this.history.closuresComplete) this.historyError = 'Histórico incompleto: faltan fechas funcionales o una atribución única de programa. Los totales afectados se muestran como —.';
            } catch { this.historyError = 'No se pudo validar la integridad del histórico.'; }
          },
          error: () => { if (historyRequest === this.historyRequest) this.historyError = 'Histórico no disponible: consulta incompleta, sin permiso o superior al límite de 10.000 registros. No se muestran totales parciales.'; },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.allPrograms = [];
        this.error = error.status === 403 ? 'No tiene permisos para consultar el análisis por programa.' : 'No fue posible cargar el análisis por programa.';
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
    if (this.loading || !this.programs.length || this.referencesLoading || (!this.history && !this.historyError)) return;
    this.printReportHtml(buildExecutiveReport(this.createReportSnapshot()));
  }

  /** Reuse the current filter and calculations; printing never issues data requests. */
  private createReportSnapshot(): ExecutiveReport {
    const dateFormat = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    const resultLabels: Record<string, string> = {
      INGRESO_TRATAMIENTO: 'Ingreso a tratamiento', REFERENCIA: 'Referencia', ABANDONO: 'Abandono',
    };
    const programs: ProgramReport[] = this.programs.map(program => {
      const id = program.programId;
      const results = this.history && !(this.month && this.isFuture(this.month))
        ? stageResults(this.history, this.year, this.month, id, this.allPrograms.map(p => p.programId)) : null;
      const treatment = results?.count('INGRESO_TRATAMIENTO') ?? null;
      const references = results?.count('REFERENCIA') ?? null;
      const abandonment = results?.count('ABANDONO') ?? null;
      const other = results?.total != null && treatment != null && references != null && abandonment != null
        ? results.total - treatment - references - abandonment : null;
      const predominant = results?.predominant;
      const reference = this.references.find(row => row.programId === id);
      // Supplemental metrics only describe the current filter, never redistribute global values.
      const active = this.programId === id && this.activeLoadedProgramId === id ? this.activeMetrics : null;
      return {
        id, name: program.programName,
        active: program.activeDemands, red: program.redCases,
        entered: this.count('entered', id), closed: this.count('closed', id),
        withoutCitation: program.withoutFirstCitation, withoutFeedback: program.withoutFeedback,
        operational: [
          { label: 'Lista de espera', value: active?.waitingList },
          { label: 'Casos rojos', value: program.redCases },
          { label: 'Promedio días por episodio', value: active?.averageWaitingDays ?? program.averageAccumulatedDays },
          { label: 'Promedio días por programa', value: active?.averageProgramDays },
          { label: 'Hitos pendientes', value: program.pendingActions },
        ],
        monthly: this.months.map((month, index) => ({
          label: month.slice(0, 3), entered: this.count('entered', id, index + 1),
          closed: this.count('closed', id, index + 1), future: this.isFuture(index + 1),
          selected: this.month === index + 1,
        })),
        annualEntered: this.count('entered', id, 0), annualClosed: this.count('closed', id, 0),
        results: [
          { label: 'Total de etapas cerradas', value: results?.total },
          { label: 'Ingreso a tratamiento', value: treatment },
          { label: 'Referencia', value: references },
          { label: 'Abandono', value: abandonment },
          { label: 'Otras causales', value: other },
          { label: 'Resultado predominante', value: predominant == null ? null : predominant.length
            ? predominant.map(code => resultLabels[code] ?? code).join(' / ') : 'Sin etapas cerradas' },
        ],
        references: [
          { label: 'Recibidas', value: reference?.receivedReferences },
          { label: 'Enviadas', value: reference?.sentReferences },
          { label: 'Pendientes', value: reference?.pendingReferences },
          { label: 'Balance', value: reference?.referenceBalance },
        ],
        complementary: [
          { label: 'Compromiso severo', value: program.severeCommitmentCases },
          { label: 'Sin primera citación', value: program.withoutFirstCitation },
          { label: 'Sin retroalimentación', value: program.withoutFeedback },
          { label: 'Referencias pendientes', value: program.pendingReferences },
          { label: 'Cierres pendientes', value: program.pendingClosures },
          { label: 'Alertas abiertas', value: program.openAlerts },
        ],
      };
    });
    return {
      year: this.year, period: this.periodLabel, emittedAt: dateFormat.format(new Date()),
      updatedAt: this.updatedAt ? dateFormat.format(this.updatedAt) : '—',
      logoUrl: `${window.location.origin}/assets/logoSSM.png`, consolidated: this.programId === 0,
      programs,
      summary: [
        { label: 'Programas incluidos', value: programs.length },
        { label: 'Demandas activas · actuales', value: this.totalActiveDemands },
        { label: 'Casos críticos · rojos actuales', value: this.sum('redCases') },
        { label: 'Demandas ingresadas · período', value: this.count('entered') },
        { label: 'Cierres definitivos · período', value: this.count('closed') },
        { label: 'Etapas de gestión cerradas', value: this.closedStageCount },
        { label: 'Referencias enviadas · período', value: this.referenceTotal('sentReferences') },
        { label: 'Referencias recibidas · período', value: this.referenceTotal('receivedReferences') },
      ],
    };
  }

  private async printReportHtml(html: string): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.title = 'Informe institucional para impresión';
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const printWindow = iframe.contentWindow;
    const doc = printWindow?.document;
    if (!printWindow || !doc) { iframe.remove(); return; }
    doc.open();
    doc.write(html);
    doc.close();
    // Every program page has its own logo. Wait for all images and fonts, not just the first.
    await Promise.all([
      doc.fonts.ready,
      ...Array.from(doc.images).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      })),
    ]);
    const cleanup = () => { window.clearTimeout(fallback); iframe.remove(); };
    const fallback = window.setTimeout(cleanup, 300000);
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.focus();
    printWindow.print();
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







