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

import { finalize } from 'rxjs';

import {
  PrioritizedEpisodeDTO,
  SupervisorDashboardDTO,
} from '../../core/models/demand-priority.models';
import { DemandService } from '../../core/services/demand.service';
import { getSemaphoreColorFromDays } from '../demand-new/utils/demand-new-semaphore.utils';
import { TokenService } from '../../services/token.service';
import {
  ProgramAnalysisDialogComponent,
} from './program-analysis-dialog/program-analysis-dialog.component';
import {
  ProgramTrajectoryDialogComponent,
} from './program-trajectory-dialog/program-trajectory-dialog.component';

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
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  fullName = 'Usuario';
  activeRole: string | null = null;
  activeProgram: string | null = null;
  activeProgramId: number | null = null;

  programs: ProgramOption[] = [];

  currentDate = new Date();

  dashboard: SupervisorDashboardDTO | null = null;
  episodes: PrioritizedEpisodeDTO[] = [];

  loadingDashboard = false;
  loadingEpisodes = false;

  dashboardError: string | null = null;
  episodesError: string | null = null;

  pageIndex = 0;
  pageSize = 20;
  totalElements = 0;

  episodeListMode: 'active' | 'closed' = 'active';

  get isHistoricalMode(): boolean {
    return this.episodeListMode === 'closed';
  }

  readonly pageSizeOptions = [10, 20, 50];

  readonly displayedColumns = [
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

  readonly sortFieldMap: Record<string, string> = {
    semaphore: 'semaphoreColor',
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
    lastManagement: 'lastManagementDate',
    suggestedAction: 'suggestedAction',
  };

  currentSort: string | null = null;

  readonly resultOptions: ResultOption[] = [
    {
      code: 'LISTA_ESPERA',
      name: 'Lista de espera',
    },
    {
      code: 'AUN_SIN_RESULTADO',
      name: 'Aún sin resultado',
    },
    {
      code: 'REFERENCIA',
      name: 'Referencia',
    },
    {
      code: 'INGRESO_TRATAMIENTO',
      name: 'Ingreso a tratamiento',
    },
    {
      code: 'EGRESO',
      name: 'Egreso',
    },
    {
      code: 'NO_ES_PERFIL',
      name: 'No es perfil',
    },
    {
      code: 'NO_CORRESPONDE',
      name: 'No corresponde',
    },
    {
      code: 'ABANDONO',
      name: 'Abandono',
    },
  ];

  readonly filtersForm = new FormGroup({
    programId: new FormControl<number | null>(null),
    resultCode: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadSessionContext();

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
    this.loadDashboard();
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
      },
      {
        emitEvent: false,
      },
    );

    this.pageIndex = 0;
    this.episodes = [];
    this.totalElements = 0;

    this.loadEpisodes();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.loadEpisodes();
  }

  clearFilters(): void {
    this.filtersForm.reset(
      {
        programId: null,
        resultCode: '',
      },
      {
        emitEvent: false,
      },
    );

    this.pageIndex = 0;
    this.loadEpisodes();
  }

  onSortChange(sort: Sort): void {
    const backendField = this.sortFieldMap[sort.active];

    this.currentSort =
      backendField && sort.direction
        ? `${backendField},${sort.direction}`
        : null;

    this.pageIndex = 0;
    this.loadEpisodes();
  }
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
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

  canManageEpisode(
    episode: PrioritizedEpisodeDTO,
  ): boolean {
    if (this.activeProgramId === null) {
      return false;
    }

    const currentProgramId = Number(
      episode?.currentProgram?.id,
    );

    const originProgramId = Number(
      episode?.originProgramId,
    );

    if (
      Number.isFinite(currentProgramId) &&
      currentProgramId === this.activeProgramId
    ) {
      return true;
    }

    if (
      Number(episode?.referenceCount ?? 0) > 0 &&
      Number.isFinite(originProgramId) &&
      originProgramId === this.activeProgramId &&
      !episode?.closureDate
    ) {
      return true;
    }

    return false;
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

    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
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

  loadEpisodes(): void {
    this.loadingEpisodes = true;
    this.episodesError = null;

    const filters = this.filtersForm.getRawValue();

    this.demandService
      .getPrioritizedEpisodes({
        page: this.pageIndex,
        size: this.pageSize,
        programId: filters.programId,
        stateCode: this.isHistoricalMode
          ? 'CERRADO'
          : 'EN_TRAMITE',
        resultCode: filters.resultCode || null,
        sort: this.currentSort,
      })
      .pipe(
        finalize(() => {
          this.loadingEpisodes = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.episodes = response?.content ?? [];
          this.totalElements = Number(
            response?.totalElements ?? 0,
          );
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
