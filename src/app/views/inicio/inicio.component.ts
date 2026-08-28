import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Router,
  RouterModule,
} from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { catchError, finalize, map, of, switchMap } from 'rxjs';
import {
  DemandEpisodeProgramContextDTO,
  PrioritizedEpisodeDTO,
  SupervisorDashboardDTO,
} from '../../core/models/demand-priority.models';
import { DemandPersonDTO, DemandService } from '../../core/services/demand.service';
import { ContactService } from '../../services/contact.service';
import { Contact } from '../../models/contact';
import { DemandListStateService } from '../../core/services/demand-list-state.service';
import { getSemaphoreColorFromDays } from '../demand-new/utils/demand-new-semaphore.utils';
import {
  resolveEpisodeAccessModeFromProgramContext,
  resolveEpisodeSuggestedActionFromProgramContext,
} from '../demand-new/utils/demand-new-permission.utils';
import { TokenService } from '../../services/token.service';
import {
  ProgramAnalysisDialogComponent,
} from './program-analysis-dialog/program-analysis-dialog.component';
import {
  ProgramTrajectoryDialogComponent,
} from './program-trajectory-dialog/program-trajectory-dialog.component';

import {
  buildInicioActiveMetrics,
  InicioActiveMetrics,
} from './utils/inicio-active-metrics.utils';
import {
  InicioClosedMetrics,
} from './utils/inicio-closed-metrics.utils';
import {
  resolveInicioViewPresentation,
  InicioViewPresentation,
} from './utils/inicio-view-mode.utils';
import {
  InicioClosedMetricsService,
} from './services/inicio-closed-metrics.service';
import {
  InicioActiveMetricsService,
} from './services/inicio-active-metrics.service';
import {
  buildInicioMetricsScopeMessage,
  buildInicioMetricsScopeTitle,
  hasInicioMetricsFilter,
  InicioMetricsFilter,
  normalizeInicioMetricsFilter,
} from './utils/inicio-metrics-filter.utils';

interface ProgramOption {
  id: number;
  name: string;
}

interface ResultOption {
  code: string;
  name: string;
}

@Component({
  standalone: true,
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
})
export class InicioComponent implements OnInit, OnDestroy {
  private readonly tokenService = inject(TokenService);
  private readonly demandService = inject(DemandService);
  private readonly contactService = inject(ContactService);
  private readonly demandListState = inject(DemandListStateService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly closedMetricsService =
    inject(InicioClosedMetricsService);

  private readonly activeMetricsService =
    inject(InicioActiveMetricsService);

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  fullName = 'Usuario';
  activeRole: string | null = null;
  activeProgram: string | null = null;
  activeProgramId: number | null = null;

  programs: ProgramOption[] = [];

  currentDate = new Date();
  dashboard: SupervisorDashboardDTO | null = null;

  closedMetrics: InicioClosedMetrics | null = null;
  loadingClosedMetrics = false;
  closedMetricsError: string | null = null;

  filteredActiveMetrics: InicioActiveMetrics | null = null;
  loadingActiveMetrics = false;
  activeMetricsError: string | null = null;

  appliedFilters: InicioMetricsFilter =
    normalizeInicioMetricsFilter({});
  episodes: PrioritizedEpisodeDTO[] = [];

  readonly programContextsByEpisodeId =
    new Map<number, DemandEpisodeProgramContextDTO>();

  loadingDashboard = false;
  loadingEpisodes = false;

  dashboardError: string | null = null;
  episodesError: string | null = null;

  expandedPersonEpisodeId: number | null = null;
  loadingPersonEpisodeId: number | null = null;

  readonly personDetailByEpisodeId: Record<
    number,
    {
      person: DemandPersonDTO;
      contact: Contact | null;
    }
  > = {};

  readonly personDetailErrorByEpisodeId: Record<
    number,
    string | null
  > = {};
  pageIndex = 0;
  pageSize = 20;
  totalElements = 0;

  episodeListMode: 'active' | 'closed' = 'active';
  get isHistoricalMode(): boolean {
    return this.episodeListMode === 'closed';
  }

  get viewPresentation(): InicioViewPresentation {
    return resolveInicioViewPresentation(
      this.episodeListMode,
    );
  }

  get activeMetrics(): InicioActiveMetrics {
    if (this.hasAppliedFilters) {
      return (
        this.filteredActiveMetrics ??
        buildInicioActiveMetrics(null)
      );
    }

    return buildInicioActiveMetrics(
      this.dashboard,
    );
  }

  get hasAppliedFilters(): boolean {
    return hasInicioMetricsFilter(
      this.appliedFilters,
    );
  }

  get metricsScopeMessage(): string {
    return buildInicioMetricsScopeMessage(
      this.appliedFilters,
      this.isHistoricalMode,
    );
  }
  get metricsScopeTitle(): string {
    return buildInicioMetricsScopeTitle(
      this.appliedFilters,
      this.isHistoricalMode,
    );
  }

  readonly pageSizeOptions = [20, 50, 100];

  readonly activeDisplayedColumns = [
    'semaphore',
    'days',
    'person',
    'rut',
    'requestDate',
    'citationFirstFirst',
    'citationSecondFirst',
    'citationFirstSecond',
    'citationSecondSecond',
    'citationFirstThird',
    'citationSecondThird',
    'optionalInterview',
    'feedback',
    'closure',
    'program',
    'result',
    'commitment',
    'lastManagement',
    'suggestedAction',
    'actions',
  ];

  readonly historicalDisplayedColumns =
    this.activeDisplayedColumns.filter(
      (column) => column !== 'result',
    );

  get displayedColumns(): string[] {
    return this.isHistoricalMode
      ? this.historicalDisplayedColumns
      : this.activeDisplayedColumns;
  }
  readonly sortFieldMap: Record<string, string> = {
    semaphore: 'accumulatedDays',
    days: 'accumulatedDays',
    person: 'personName',
    rut: 'rut',
    requestDate: 'originalRequestDate',
    citationFirstFirst: 'firstCitationFirstInterviewDate',
    citationSecondFirst: 'secondCitationFirstInterviewDate',
    citationFirstSecond: 'firstCitationSecondInterviewDate',
    citationSecondSecond: 'secondCitationSecondInterviewDate',
    citationFirstThird: 'firstCitationThirdInterviewDate',
    citationSecondThird: 'secondCitationThirdInterviewDate',
    optionalInterview: 'optionalInterviewDate',
    feedback: 'feedbackDate',
    closure: 'closureDate',
    program: 'currentProgram.name',
    result: 'resultCode',
    commitment: 'biopsychosocialCommitmentCode',
    lastManagement: 'lastManagement',
    suggestedAction: 'suggestedAction',
  };

  currentSort: string | null = null;
  readonly activeResultOptions: ResultOption[] = [
    {
      code: 'AUN_SIN_RESULTADO',
      name: 'Aún sin resultado',
    },
    {
      code: 'LISTA_ESPERA',
      name: 'Lista de espera',
    },
  ];

  readonly historicalResultOptions: ResultOption[] = [
    {
      code: 'INGRESO_TRATAMIENTO',
      name: 'Ingreso a tratamiento',
    },
    {
      code: 'REFERENCIA',
      name: 'Referencia',
    },
    {
      code: 'ABANDONO',
      name: 'Abandono',
    },
  ];

  get resultOptions(): ResultOption[] {
    return this.isHistoricalMode
      ? this.historicalResultOptions
      : this.activeResultOptions;
  }

  readonly filtersForm = new FormGroup({
    programId: new FormControl<number | null>(null),
    resultCode: new FormControl<string>('', {
      nonNullable: true,
    }),
    search: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadSessionContext();
    this.restoreListState();

    this.refresh();

    this.clockInterval = setInterval(() => {
      this.currentDate = new Date();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  openProgramAnalysis(): void {
    this.dialog.open(ProgramAnalysisDialogComponent, {
      width: '1180px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      restoreFocus: true,
    });
  }
  refresh(): void {
    this.loadCurrentMetrics();
    this.loadEpisodes();
  }

  setEpisodeListMode(
    mode: 'active' | 'closed',
  ): void {
    if (
      this.episodeListMode === mode ||
      this.loadingEpisodes
    ) {
      return;
    }

    this.episodeListMode = mode;

    this.filtersForm.reset(
      {
        programId: null,
        resultCode: '',
        search: '',
      },
      {
        emitEvent: false,
      },
    );

    this.appliedFilters =
      normalizeInicioMetricsFilter({});

    this.pageIndex = 0;
    this.episodes = [];
    this.totalElements = 0;

    this.saveListState();

    this.loadCurrentMetrics();
    this.loadEpisodes();
  }

    applyFilters(): void {
    this.appliedFilters =
      normalizeInicioMetricsFilter(
        this.filtersForm.getRawValue(),
      );

    this.pageIndex = 0;
    this.saveListState();

    this.loadCurrentMetrics();
    this.loadEpisodes();
  }

  clearFilters(): void {
    this.filtersForm.reset(
      {
        programId: null,
        resultCode: '',
        search: '',
      },
      {
        emitEvent: false,
      },
    );

    this.appliedFilters =
      normalizeInicioMetricsFilter({});

    this.pageIndex = 0;
    this.saveListState();

    this.loadCurrentMetrics();
    this.loadEpisodes();
  }

  onSortChange(sort: Sort): void {
    const backendField =
      this.isHistoricalMode && sort.active === 'suggestedAction'
        ? 'resultCode'
        : this.sortFieldMap[sort.active];

    this.currentSort =
      backendField && sort.direction
        ? `${backendField},${sort.direction}`
        : null;

    this.pageIndex = 0;
    this.saveListState();
    this.loadEpisodes();
  }
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveListState();
    this.loadEpisodes();
  }

  openProgramTrajectory(
    episode: PrioritizedEpisodeDTO,
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    if (Number(episode.referenceCount ?? 0) <= 0) {
      return;
    }

    this.dialog.open(ProgramTrajectoryDialogComponent, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'program-trajectory-modal',
      data: {
        rut: episode.rut,
        episodeCode: episode.episodeCode,
        personName: episode.personName,
      },
    });
  }

  getEpisodeOpenMode(
    episode: PrioritizedEpisodeDTO,
  ): 'view' | 'manage' {
    if (this.isHistoricalMode) {
      return 'view';
    }

    const context =
      this.programContextsByEpisodeId.get(
        episode.episodeId,
      );

    const accessMode =
      resolveEpisodeAccessModeFromProgramContext(
        this.activeProgramId,
        context,
      );

    return accessMode === 'MANAGE'
      ? 'manage'
      : 'view';
  }
  getEpisodeActionLabel(
    episode: PrioritizedEpisodeDTO,
  ): string {
    return this.getEpisodeOpenMode(episode) === 'manage'
      ? 'Gestionar'
      : 'Solo lectura';
  }

  getEpisodeActionIcon(
    episode: PrioritizedEpisodeDTO,
  ): string {
    return this.getEpisodeOpenMode(episode) === 'manage'
      ? 'edit'
      : 'visibility';
  }

  getEpisodeActionTooltip(
    episode: PrioritizedEpisodeDTO,
  ): string {
    return this.getEpisodeOpenMode(episode) === 'manage'
      ? 'Gestionar demanda'
      : 'Abrir ficha en modo solo lectura';
  }
  getEpisodeSuggestedActionLabel(
    episode: PrioritizedEpisodeDTO,
  ): string {
    const context =
      this.programContextsByEpisodeId.get(
        episode.episodeId,
      );

    return resolveEpisodeSuggestedActionFromProgramContext(
      this.activeProgramId,
      context,
      episode.suggestedAction,
    );
  }
  getEpisodeStageStateCode(
    episode: PrioritizedEpisodeDTO,
  ): string {
    const context =
      this.programContextsByEpisodeId.get(
        episode.episodeId,
      );

    return String(
      context?.stageStateCode ??
        episode.currentStageStateCode ??
        episode.stateCode ??
        '',
    ).trim();
  }

  getEpisodeStageResultCode(
    episode: PrioritizedEpisodeDTO,
  ): string {
    const context =
      this.programContextsByEpisodeId.get(
        episode.episodeId,
      );

    return String(
      context?.stageResultCode ??
        episode.currentStageResultCode ??
        episode.resultCode ??
        '',
    ).trim();
  }

  getEpisodeStageClosureDate(
    episode: PrioritizedEpisodeDTO,
  ): string | null {
    const context =
      this.programContextsByEpisodeId.get(
        episode.episodeId,
      );

    if (context) {
      return context.closed === true
        ? context.closureDate ?? null
        : null;
    }

    return episode.closureDate ?? null;
  }

  openEpisode(
    episode: PrioritizedEpisodeDTO,
    mode: 'view' | 'manage',
  ): void {
    this.router.navigate(
      ['/demand-new'],
      {
        queryParams: {
          rut: episode.rut,
          episodeId: episode.episodeId,
          mode,
        },
      },
    );
  }
  getPersonAge(
    birthdate: string | null | undefined,
  ): number | null {
    const value = String(birthdate ?? '').trim();

    if (!value) {
      return null;
    }

    const parts = value.slice(0, 10).split('-');

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return null;
    }

    const today = new Date();

    let age = today.getFullYear() - year;

    const monthDifference =
      today.getMonth() + 1 - month;

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < day
      )
    ) {
      age--;
    }

    return age >= 0 ? age : null;
  }
  formatCompactDate(value: string | null | undefined): string {
    const text = String(value ?? '').trim();

    if (!text) {
      return '—';
    }

    const parts = text.slice(0, 10).split('-');

    if (parts.length !== 3) {
      return text;
    }

    const shortYear = parts[0].slice(-2);

    return `${parts[2]}/${parts[1]}/${shortYear}`;
  }

  formatCompactTime(value: string | null | undefined): string {
    const text = String(value ?? '').trim();

    return text
      ? text.slice(0, 5)
      : '';
  }

  getCommitmentLabel(value: string | null | undefined): string {
    const code = String(value ?? '').trim().toUpperCase();

    const labels: Record<string, string> = {
      LEVE: 'Leve',
      MODERADO: 'Moderado',
      SEVERO: 'Severo',
    };

    return labels[code] ?? 'Sin evaluación';
  }

  getCommitmentClass(value: string | null | undefined): string {
    const code = String(value ?? '').trim().toLowerCase();

    if (
      code === 'leve' ||
      code === 'moderado' ||
      code === 'severo'
    ) {
      return `commitment--${code}`;
    }

    return 'commitment--neutral';
  }
  formatDisplayDate(value: string | null | undefined): string {
    const text = String(value ?? '').trim();

    if (!text) {
      return 'Sin fecha';
    }

    const parts = text.slice(0, 10).split('-');

    if (parts.length !== 3) {
      return text;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  formatStateLabel(value: string | null | undefined): string {
    const code = String(value ?? '')
      .trim()
      .toUpperCase();

    const labels: Record<string, string> = {
      EN_TRAMITE: 'En trámite',
      LISTA_ESPERA: 'Lista de espera',
      INGRESADO: 'Ingresado',
      EGRESADO: 'Egresado',
      CERRADO: 'Cerrado',
    };

    return labels[code] ?? 'Sin estado';
  }

  formatResultLabel(value: string | null | undefined): string {
    const code = String(value ?? '')
      .trim()
      .toUpperCase();

    const option = this.resultOptions.find(
      (item) => item.code === code,
    );

    return option?.name ?? this.formatCodeLabel(code, 'Sin resultado');
  }

  getSemaphoreColorByDays(
    accumulatedDays: number | null | undefined,
  ): 'VERDE' | 'AMARILLO' | 'ROJO' {
    const days = Math.max(0, Number(accumulatedDays ?? 0));

    return getSemaphoreColorFromDays(days) ?? 'VERDE';
  }
  getSemaphoreLabelByDays(
    accumulatedDays: number | null | undefined,
  ): string {
    const color = this.getSemaphoreColorByDays(accumulatedDays);

    const labels: Record<'VERDE' | 'AMARILLO' | 'ROJO', string> = {
      VERDE: 'Dentro de plazo: hasta 45 días',
      AMARILLO: 'Seguimiento: entre 46 y 90 días',
      ROJO: 'Caso crítico: 91 días o más',
    };

    return labels[color];
  }
  getSemaphoreLabel(value: string | null | undefined): string {
    const code = String(value ?? '')
      .trim()
      .toUpperCase();

    const labels: Record<string, string> = {
      VERDE: 'Dentro de plazo',
      AMARILLO: 'Seguimiento',
      NARANJO: 'Prioridad alta',
      ROJO: 'Caso crítico',
    };

    return labels[code] ?? 'Sin clasificación';
  }

  getSemaphoreClass(value: string | null | undefined): string {
    const code = String(value ?? '')
      .trim()
      .toLowerCase();

    if (
      code === 'verde' ||
      code === 'amarillo' ||
      code === 'naranjo' ||
      code === 'rojo'
    ) {
      return `semaphore--${code}`;
    }

    return 'semaphore--neutral';
  }
  get paginationStart(): number {
    if (this.totalElements <= 0) {
      return 0;
    }

    return this.pageIndex * this.pageSize + 1;
  }

  get paginationEnd(): number {
    if (this.totalElements <= 0) {
      return 0;
    }

    return Math.min(
      (this.pageIndex + 1) * this.pageSize,
      this.totalElements,
    );
  }

  get paginationSummary(): string {
    if (this.totalElements <= 0) {
      return 'Sin demandas';
    }

    const total = this.totalElements.toLocaleString('es-CL');

    return `Mostrando ${this.paginationStart}–${this.paginationEnd} de ${total} ${
      this.totalElements === 1 ? 'demanda' : 'demandas'
    }`;
  }


  get averageDaysLabel(): string {
    const value = Number(
      this.dashboard?.averageAccumulatedDays ?? 0,
    );

    return value.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  }

  get currentDateLabel(): string {
    const date = this.currentDate.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const time = this.currentDate.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${date} — ${time}`;
  }

  trackByEpisodeId(
    _index: number,
    item: PrioritizedEpisodeDTO,
  ): number {
    return item.episodeId;
  }
  private loadClosedMetrics(): void {
    this.loadingClosedMetrics = true;
    this.closedMetricsError = null;

    this.closedMetricsService
      .load(this.appliedFilters)
      .pipe(
        finalize(() => {
          this.loadingClosedMetrics = false;
        }),
      )
      .subscribe({
        next: (metrics) => {
          this.closedMetrics = metrics;
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            '[Inicio] Error cargando indicadores históricos:',
            error,
          );

          this.closedMetrics = null;

          this.closedMetricsError =
            error.status === 403
              ? 'No tiene permisos para consultar los indicadores históricos.'
              : 'No fue posible cargar los indicadores de demandas cerradas.';
        },
      });
  }
  private loadCurrentMetrics(): void {
    if (this.isHistoricalMode) {
      this.loadClosedMetrics();
      return;
    }

    if (this.hasAppliedFilters) {
      this.loadActiveFilteredMetrics();
      return;
    }

    this.filteredActiveMetrics = null;
    this.activeMetricsError = null;

    this.loadDashboard();
  }

  private loadActiveFilteredMetrics(): void {
    this.loadingActiveMetrics = true;
    this.activeMetricsError = null;

    this.activeMetricsService
      .load(this.appliedFilters)
      .pipe(
        finalize(() => {
          this.loadingActiveMetrics = false;
        }),
      )
      .subscribe({
        next: (metrics) => {
          this.filteredActiveMetrics = metrics;
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            '[Inicio] Error cargando indicadores activos filtrados:',
            error,
          );

          this.filteredActiveMetrics = null;

          this.activeMetricsError =
            error.status === 403
              ? 'No tiene permisos para consultar los indicadores filtrados.'
              : 'No fue posible calcular los indicadores para los filtros aplicados.';
        },
      });
  }

  private loadDashboard(): void {
    this.loadingDashboard = true;
    this.dashboardError = null;

    this.demandService
      .getSupervisorDashboard()
      .pipe(
        finalize(() => {
          this.loadingDashboard = false;
        }),
      )
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            '[Inicio] Error cargando indicadores:',
            error,
          );

          this.dashboard = null;

          this.dashboardError =
            error.status === 403
              ? 'No tiene permisos para consultar los indicadores generales.'
              : 'No fue posible cargar los indicadores de demanda.';
        },
      });
  }

  togglePersonDetails(
    episode: PrioritizedEpisodeDTO,
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    const episodeId = Number(episode.episodeId);

    if (!Number.isFinite(episodeId) || episodeId <= 0) {
      return;
    }

    if (this.expandedPersonEpisodeId === episodeId) {
      this.expandedPersonEpisodeId = null;
      return;
    }

    this.expandedPersonEpisodeId = episodeId;

    if (
      this.personDetailByEpisodeId[episodeId] ||
      this.loadingPersonEpisodeId === episodeId
    ) {
      return;
    }

    this.loadPersonDetails(episode);
  }

  readonly isPersonDetailRow = (
    _index: number,
    episode: PrioritizedEpisodeDTO,
  ): boolean => {
    return this.isPersonDetailsExpanded(episode);
  };
  isPersonDetailsExpanded(
    episode: PrioritizedEpisodeDTO,
  ): boolean {
    return this.expandedPersonEpisodeId === Number(episode.episodeId);
  }

  private loadPersonDetails(
    episode: PrioritizedEpisodeDTO,
  ): void {
    const episodeId = Number(episode.episodeId);
    const rut = String(episode.rut ?? '').trim();

    if (!rut) {
      this.personDetailErrorByEpisodeId[episodeId] =
        'No fue posible identificar el RUN del demandante.';
      return;
    }

    this.loadingPersonEpisodeId = episodeId;
    this.personDetailErrorByEpisodeId[episodeId] = null;

    this.demandService
      .findPersonByRut(rut)
      .pipe(
        switchMap((person) => {
          const postulantId = Number(person?.id);

          if (!Number.isFinite(postulantId) || postulantId <= 0) {
            return of({
              person,
              contact: null as Contact | null,
            });
          }

          return this.contactService
            .getByPostulant(postulantId)
            .pipe(
              catchError(() => of(null)),
              map((contact) => ({
                person,
                contact,
              })),
            );
        }),
        finalize(() => {
          if (this.loadingPersonEpisodeId === episodeId) {
            this.loadingPersonEpisodeId = null;
          }
        }),
      )
      .subscribe({
        next: (detail) => {
          this.personDetailByEpisodeId[episodeId] = detail;
        },
        error: () => {
          this.personDetailErrorByEpisodeId[episodeId] =
            'No fue posible cargar los datos del demandante.';
        },
      });
  }
  loadEpisodes(): void {
    this.loadingEpisodes = true;
    this.episodesError = null;

    const filters = this.appliedFilters;

    this.demandService
      .getPrioritizedEpisodes({
        page: this.pageIndex,
        size: this.pageSize,
        programId: filters.programId,
        stateCode: this.isHistoricalMode
          ? 'CERRADO'
          : 'EN_TRAMITE',
        resultCode: filters.resultCode || null,
        search: filters.search?.trim() || null,
        sort: this.currentSort,
      })
      .pipe(
        finalize(() => {
          this.loadingEpisodes = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const episodes = response?.content ?? [];
          const totalElements = Number(
            response?.totalElements ?? 0,
          );

          const totalPages = Math.max(
            1,
            Math.ceil(totalElements / this.pageSize),
          );

          const lastValidPageIndex = totalPages - 1;

          if (
            totalElements > 0 &&
            this.pageIndex > lastValidPageIndex
          ) {
            this.pageIndex = lastValidPageIndex;
            this.saveListState();
            this.loadEpisodes();
            return;
          }

          if (
            totalElements === 0 &&
            this.pageIndex !== 0
          ) {
            this.pageIndex = 0;
            this.saveListState();
          }

          this.episodes = episodes;
          this.totalElements = totalElements;

          this.loadEpisodeProgramContexts(this.episodes);
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            '[Inicio] Error cargando bandeja priorizada:',
            error,
          );

          this.episodes = [];
          this.totalElements = 0;

          this.episodesError =
            error.status === 403
              ? 'No tiene permisos para consultar la bandeja priorizada.'
              : 'No fue posible cargar la bandeja priorizada de demanda.';
        },
      });
  }

  private loadEpisodeProgramContexts(
    episodes: PrioritizedEpisodeDTO[],
  ): void {
    this.programContextsByEpisodeId.clear();

    const programId = this.activeProgramId;

    const episodeIds = Array.from(
      new Set(
        episodes
          .map((episode) => Number(episode.episodeId))
          .filter(
            (episodeId) =>
              Number.isFinite(episodeId) &&
              episodeId > 0,
          ),
      ),
    );

    if (
      programId === null ||
      programId <= 0 ||
      episodeIds.length === 0
    ) {
      return;
    }

    this.demandService
      .getEpisodeProgramContexts({
        programId,
        episodeIds,
      })
      .subscribe({
        next: (contexts) => {
          this.programContextsByEpisodeId.clear();

          for (const context of contexts ?? []) {
            this.programContextsByEpisodeId.set(
              context.episodeId,
              context,
            );
          }

          console.debug(
            '[Inicio] Contextos por programa cargados:',
            {
              programId,
              episodeIds,
              contexts,
            },
          );
        },

        error: (error: HttpErrorResponse) => {
          this.programContextsByEpisodeId.clear();

          console.error(
            '[Inicio] Error cargando contextos por programa:',
            error,
          );
        },
      });
  }
  private saveListState(): void {
    const filters = this.appliedFilters;

    this.demandListState.save({
      mode: this.episodeListMode,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      programId: filters.programId,
      resultCode: filters.resultCode ?? '',
      search: filters.search ?? '',
      sort: this.currentSort,
    });
  }
  private restoreListState(): void {
    const state = this.demandListState.load();

    if (!state) {
      return;
    }

    this.episodeListMode = state.mode;
    this.pageIndex = state.pageIndex;
    this.pageSize = state.pageSize;
    this.currentSort = state.sort;

    this.filtersForm.reset(
      {
        programId: state.programId,
        resultCode: state.resultCode,
        search: state.search,
      },
      {
        emitEvent: false,
      },
    );

    this.appliedFilters =
      normalizeInicioMetricsFilter({
        programId: state.programId,
        resultCode: state.resultCode,
        search: state.search,
      });
}
  private loadSessionContext(): void {
    const profile = this.tokenService.getUserProfile();

    this.fullName =
      profile?.fullName ||
      profile?.name ||
      'Usuario';

    const roles = this.tokenService.getUserRoles() || [];

    this.activeRole =
      sessionStorage.getItem('activeRole') ||
      roles[0] ||
      null;

    const rawPrograms =
      this.tokenService.getUserPrograms() || [];

    this.programs = rawPrograms
      .map((program: any) => ({
        id: Number(
          program?.id ??
            program?.programId,
        ),

        name: String(
          program?.name ??
            program?.programName ??
            '',
        ).trim(),
      }))
      .filter(
        (program: ProgramOption) =>
          Number.isFinite(program.id) &&
          program.id > 0 &&
          !!program.name,
      );

    const activeProgramId = Number(
      this.tokenService.getActiveProgramId(),
    );

    this.activeProgramId =
      Number.isFinite(activeProgramId) &&
      activeProgramId > 0
        ? activeProgramId
        : null;

    this.activeProgram =
      this.tokenService.getActiveProgram() ||
      this.programs.find(
        (program) =>
          program.id === this.activeProgramId,
      )?.name ||
      null;
  }

  private formatCodeLabel(
    value: string,
    fallback: string,
  ): string {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ');

    if (!normalized) {
      return fallback;
    }

    return (
      normalized.charAt(0).toUpperCase() +
      normalized.slice(1)
    );
  }
}
