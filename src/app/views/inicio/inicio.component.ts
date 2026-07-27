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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { finalize } from 'rxjs';

import {
  PrioritizedEpisodeDTO,
  SupervisorDashboardDTO,
} from '../../core/models/demand-priority.models';
import { DemandService } from '../../core/services/demand.service';
import { TokenService } from '../../services/token.service';

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
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
})
export class InicioComponent implements OnInit, OnDestroy {
  private readonly tokenService = inject(TokenService);
  private readonly demandService = inject(DemandService);
  private readonly router = inject(Router);

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

  readonly pageSizeOptions = [10, 20, 50];

  readonly displayedColumns = [
    'semaphore',
    'days',
    'person',
    'rut',
    'requestDate',
    'program',
    'result',
    'lastManagement',
    'suggestedAction',
    'actions',
  ];

  readonly resultOptions: ResultOption[] = [
    {
      code: 'LISTA_ESPERA',
      name: 'Lista de espera',
    },
    {
      code: 'AUN_SIN_RESULTADO',
      name: 'AÃºn sin resultado',
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

  refresh(): void {
    this.loadDashboard();
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

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEpisodes();
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
    const responsibleProgramId = Number(
      episode?.currentProgram?.id,
    );

    return (
      this.activeProgramId !== null &&
      Number.isFinite(responsibleProgramId) &&
      responsibleProgramId === this.activeProgramId
    );
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
      EN_TRAMITE: 'En trÃ¡mite',
      LISTA_ESPERA: 'Lista de espera',
      INGRESADO: 'Ingresado',
      EGRESADO: 'Egresado',
      CERRADO: 'Cerrado',
    };

    return labels[code] ?? this.formatCodeLabel(code, 'Sin estado');
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

  getSemaphoreLabel(value: string | null | undefined): string {
    const code = String(value ?? '')
      .trim()
      .toUpperCase();

    const labels: Record<string, string> = {
      VERDE: 'Dentro de plazo',
      AMARILLO: 'Seguimiento',
      NARANJO: 'Prioridad alta',
      ROJO: 'Caso crÃ­tico',
    };

    return labels[code] ?? 'Sin clasificaciÃ³n';
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

    return `${date} â€” ${time}`;
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
        resultCode: filters.resultCode || null,
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
