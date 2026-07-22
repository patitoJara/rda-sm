import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { throwError } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Postulant } from '@app/models/postulant';
import { DemandEpisodeService } from '@app/services/demand/demand-episode.service';
import { PreloadCatalogsService } from '@app/services/demand/preload-catalogs.service';
import { PostulantService } from '@app/services/postulant.service';
import { ProgramProfessionalService } from '@app/services/program-professional.service';
import { TokenService } from '@app/services/token.service';

import {
  DemandCatalogItem,
  DemandCatalogsDTO,
  DemandService,
} from '../../core/services/demand.service';

import {
  ActiveActionPanel,
  SummaryNavigationItem,
  SummarySectionId,
} from './models/demand-new-view.types';

import {
  formatDateForBackend,
  formatRut,
  getTodayForDateInput,
  parseBackendDate,
  toStringOrNull,
} from './utils/demand-new-format.utils';

import {
  buildEventTime,
  normalizeEventTime,
  normalizeSemaphoreColor,
  normalizeText,
} from './utils/demand-new-event.utils';

import {
  extractArray,
  filterConvPrevByIntPrevId,
} from './utils/demand-new-data.utils';
import { getEventSortDate } from './utils/demand-new-history.utils';
import { todayDateOnly, toBackendDate } from './utils/demand-new-date.utils';
import {
  calculatePreviousTreatmentNumber,
  getCurrentEpisodeId,
} from './utils/demand-new-episode.utils';
import {
  filterPendingCitationEvents,
  findSelectedAttendanceCitation,
  formatCitationOptionDate as resolveCitationOptionDate,
  formatCitationOptionTime as resolveCitationOptionTime,
  getNextCitationNumberForProgram,
  getAttendanceForCitation as findAttendanceForCitation,
  getCitationAttendanceLabel as resolveCitationAttendanceLabel,
  getCitationNumber as calculateCitationNumber,
  getCitationTemporalLabel as resolveCitationTemporalLabel,
  isExpiredCitation as checkExpiredCitation,
  isFutureCitation as checkFutureCitation,
  isTodayCitation as checkTodayCitation,
} from './utils/demand-new-citation.utils';
import { filterObservationEvents } from './utils/demand-new-observation.utils';
import { buildAttendancePayload } from './utils/demand-new-attendance.utils';
import {
  getAttendanceErrorMessage,
  handleAttendanceSuccess,
  logAttendanceResponse,
  validateAttendanceContext,
} from './actions/demand-new-attendance.actions';
import {
  handleObservationSuccess,
} from './actions/demand-new-observation.actions';
import {
  handleInterviewSuccess,
} from './actions/demand-new-interview.actions';
import {
  buildCitationContext,
  handleCitationSuccess,
} from './actions/demand-new-citation.actions';
import {
  canManageEpisode,
  getEpisodeProgramRestrictionMessage,
} from './utils/demand-new-permission.utils';
import {
  getSemaphoreCssClass,
  getSemaphoreDescriptionText,
} from './utils/demand-new-semaphore.utils';
import {
  formatDisplayDate as formatDisplayDateValue,
  formatDisplayTime as formatDisplayTimeValue,
} from './utils/demand-new-display.utils';
import { normalizeProfessionalForCitation } from './utils/demand-new-professional.utils';
import {
  buildSecondarySubstances,
  reorderSecondarySubstanceMap,
} from './utils/demand-new-substance.utils';

@Component({
  selector: 'app-demand-new',
  standalone: true,
  templateUrl: './demand-new.component.html',
  styleUrls: ['./demand-new.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatDividerModule,
    MatSelectModule,
    MatRadioModule,
    MatProgressBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class DemandNewComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private postulantService = inject(PostulantService);
  private preloadCatalogs = inject(PreloadCatalogsService);
  private readonly tokenService = inject(TokenService);
  private readonly demandService = inject(DemandService);
  private readonly demandEpisodeService = inject(DemandEpisodeService);
  private readonly programProfessionalService = inject(
    ProgramProfessionalService,
  );

  demandCatalogs: DemandCatalogsDTO | null = null;

  episodeTypes: DemandCatalogItem[] = [];
  eventTypes: DemandCatalogItem[] = [];
  attendanceStatuses: DemandCatalogItem[] = [];
  closureReasons: DemandCatalogItem[] = [];
  programPopulations: DemandCatalogItem[] = [];
  programModalities: DemandCatalogItem[] = [];
  programPlans: DemandCatalogItem[] = [];
  regions: DemandCatalogItem[] = [];
  cities: DemandCatalogItem[] = [];

  isLoadingDemandCatalogs = false;
  demandCatalogsError = '';

  showDemandantDetails = false;

  sexes: any[] = [];
  communes: any[] = [];
  intPrev: any[] = [];
  convPrev: any[] = [];
  filteredConvPrev: any[] = [];

  substances: any[] = [];
  secondarySubstanceMap: { [id: number]: number } = {};

  professions: any[] = [];
  contactTypes: any[] = [];
  senders: any[] = [];
  diverters: any[] = [];

  searchForm = this.fb.group({
    rut: ['', Validators.required],
  });

  activeProgramName: string | null = null;
  activeProgramId: number | null = null;
  stageVisualState = 'Pendiente de creación';

  activeActionPanel: ActiveActionPanel = null;

  isSavingObservation = false;
  observationError: string | null = null;
  observationSuccess: string | null = null;

  isSavingCitation = false;
  citationError: string | null = null;
  citationSuccess: string | null = null;

  isSavingAttendance = false;
  attendanceError: string | null = null;
  attendanceSuccess: string | null = null;

  isSavingInterview = false;
  interviewError: string | null = null;
  interviewSuccess: string | null = null;

  showBackToNavigation = false;
  highlightedSummarySection: SummarySectionId | null = null;

  historyDisplayLimit = 8;
  showAllHistory = false;
  historyTypeFilter = 'TODOS';

  private summaryHighlightTimeout: ReturnType<typeof setTimeout> | null = null;

  citationForm = this.fb.group({
    eventDate: new FormControl<Date | null>(new Date(), Validators.required),
    eventHour: ['', Validators.required],
    eventPeriod: ['AM', Validators.required],
    programProfessionalId: new FormControl<number | null>(
      null,
      Validators.required,
    ),
    professionName: ['', Validators.required],
    comment: ['', Validators.required],
    citationComment: [''],
  });

  attendanceForm = this.fb.group({
    citationEventId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),

    attendanceStatusId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),

    comment: ['', Validators.required],
  });

  interviewForm = this.fb.group({
    eventDate: [new Date(), Validators.required],
    eventHour: ['', [Validators.pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9]$/)]],
    eventPeriod: ['AM'],
    comment: ['', Validators.required],
    observation: ['', Validators.required],
    nextAction: [''],
    nextActionDate: [null as Date | null],
  });

  longitudinal: any | null = null;
  episodeEvents: any[] = [];
  isLoadingLongitudinal = false;
  longitudinalError: string | null = null;

  professionals: any[] = [];
  isLoadingProfessionals = false;
  professionalsError: string | null = null;

  observationForm = this.fb.group({
    comment: ['', Validators.required],
    observation: [''],
  });

  personForm = this.fb.group({
    rut: new FormControl<string>(
      { value: '', disabled: true },
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),

    firstName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    secondName: new FormControl<string>('', {
      nonNullable: true,
    }),

    firstLastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    secondLastName: new FormControl<string>('', {
      nonNullable: true,
    }),

    birthDate: new FormControl<Date | null>(null, {
      validators: [Validators.required],
    }),

    sex: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),

    phone: new FormControl<string>('', {
      nonNullable: true,
    }),

    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.email],
    }),

    address: new FormControl<string>('', {
      nonNullable: true,
    }),

    commune: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),

    intPrev: new FormControl<number | null>(null),

    convPrev: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),

    contactName: [''],
    contactDescription: [''],
    contactCellphone: [''],
    contactEmail: ['', Validators.email],
  });

  episodeForm = this.fb.group({
    episodeTypeId: [null as number | null, Validators.required],

    originalRequestDate: [getTodayForDateInput(), Validators.required],

    initialProgramId: [null as number | null, Validators.required],
    initialProgramName: [{ value: '', disabled: true }],
    currentProgramName: [{ value: '', disabled: true }],

    contactType: [null as number | null, Validators.required],
    sender: [null as number | null],
    diverter: [null as number | null],

    previousTreatmentNumber: [0],

    currentState: [{ value: 'EN TRÁMITE', disabled: true }],
    currentResult: [{ value: 'AÚN SIN RESULTADO', disabled: true }],

    initialObservation: [''],

    primarySubstanceId: [null as number | null],
    secondarySubstances: [
      [] as Array<{
        substanceId: number;
        order: number;
      }>,
    ],
  });

  // Estados vacíos reales: no mocks
  personLoaded = false;
  episodeLoaded = false;
  stageLoaded = false;

  isSearching = false;
  isSavingPerson = false;
  searched = false;
  personNotFound = false;
  selectedPerson: Postulant | null = null;
  searchError: string | null = null;
  personSaveError: string | null = null;
  showCreatePersonForm = false;
  showCreateEpisodeForm = false;

  isSavingEpisode = false;
  episodeSaveError: string | null = null;
  createdEpisode: any | null = null;
  episodeSummary: any | null = null;

  readonly flowSteps = [
    'Persona',
    'Episodio',
    'Etapa por programa',
    'Eventos',
    'Referencias',
  ];

  readonly personFields = [
    'RUN',
    'Primer nombre',
    'Segundo nombre',
    'Primer apellido',
    'Segundo apellido',
    'Fecha nacimiento',
    'Sexo',
    'Teléfono',
    'Correo',
    'Dirección',
    'Comuna',
    'Previsión',
  ];

  readonly episodeFields = [
    'Código episodio',
    'Tipo episodio',
    'Fecha solicitud original',
    'Programa inicial',
    'Programa actual',
    'Vía de ingreso',
    'Remitente',
    'Derivador',
    'Número de tratamiento previo',
    'Estado actual',
    'Resultado actual',
    'Días acumulados',
    'Fecha ingreso a tratamiento',
    'Fecha egreso',
    'Motivo cierre',
    'Observación inicial',
  ];

  readonly stageFields = [
    'Programa responsable',
    'Orden de etapa',
    'Fecha recepción',
    'Fecha cierre',
    'Estado de etapa',
    'Resultado de etapa',
    'Etapa actual',
    'Motivo cierre etapa',
    'Observación cierre etapa',
  ];

  readonly structuralSections = [
    {
      icon: 'timeline',
      title: 'Eventos del episodio',
      subtitle:
        'Registro cronológico de citaciones, entrevistas, observaciones, ingreso, egreso y cierre.',
      empty: 'No existen eventos registrados.',
      fields: [
        'Tipo evento',
        'Fecha evento',
        'Hora evento',
        'Profesión',
        'Profesional',
        'Estado citación',
        'Resultado asociado',
        'Comentario de citación',
        'Observación general',
        'Próxima acción',
        'Fecha próxima acción',
        'Usuario que registra',
      ],
    },
    {
      icon: 'sync_alt',
      title: 'Referencias entre programas',
      subtitle:
        'Cierre de etapa origen y creación de etapa receptora sin reiniciar días.',
      empty:
        'No existen referencias registradas. Las referencias conservarán la fecha original y los días acumulados.',
      fields: [
        'Programa origen',
        'Programa destino',
        'Fecha referencia',
        'Motivo referencia',
        'Observación',
        'Documento asociado',
        'Usuario que registra',
        'Impacto de la referencia',
      ],
    },
    {
      icon: 'science',
      title: 'Sustancias',
      subtitle:
        'Sustancia principal, sustancias secundarias, nivel u orden y observación.',
      empty: 'No existen sustancias asociadas al episodio.',
      fields: [
        'Sustancia principal',
        'Sustancias secundarias',
        'Nivel / orden',
        'Observación',
      ],
    },
    {
      icon: 'attach_file',
      title: 'Documentos asociados',
      subtitle:
        'Documentos vinculados a episodio, etapa, evento, referencia, egreso o cierre.',
      empty: 'No existen documentos asociados.',
      fields: [
        'Tipo documento',
        'Archivo',
        'Asociado a',
        'Usuario que sube',
        'Fecha subida',
      ],
    },
    {
      icon: 'notification_important',
      title: 'Alertas y seguimiento',
      subtitle:
        'Alertas con prioridad, responsable, próxima acción y estado de seguimiento.',
      empty: 'No existen alertas activas.',
      fields: [
        'Tipo alerta',
        'Nivel prioridad',
        'Descripción',
        'Acción realizada',
        'Próxima acción',
        'Fecha comprometida',
        'Responsable',
        'Estado alerta',
      ],
    },
    {
      icon: 'verified_user',
      title: 'Auditoría / decisiones críticas',
      subtitle:
        'Trazabilidad de cierres, referencias, ingresos, egresos, rectificaciones y reversión superior.',
      empty:
        'Las decisiones críticas quedarán registradas con usuario, fecha y autorización.',
      fields: [
        'Acción crítica',
        'Valor anterior',
        'Valor nuevo',
        'Motivo',
        'Usuario que ejecuta',
        'Usuario que autoriza',
        'Fecha acción',
        'Reversión / rectificación',
      ],
    },
  ];

  readonly operativeActions = [
    {
      icon: 'event_available',
      title: 'Nueva citación',
      description:
        'Registrar fecha, hora, profesional y comentario de citación.',
      enabled: true,
      panel: 'citation' as const,
    },
    {
      icon: 'how_to_reg',
      title: 'Registrar asistencia',
      description:
        'Marcar si se presentó, no se presentó, reprogramó o quedó pendiente.',
      enabled: true,
      panel: 'attendance' as const,
    },
    {
      icon: 'psychology',
      title: 'Entrevista / evaluación',
      description:
        'Registrar entrevista, evaluación clínica/social o antecedentes relevantes.',
      enabled: true,
      panel: 'interview' as const,
    },
    {
      icon: 'notes',
      title: 'Observación',
      description: 'Agregar observación general del episodio o etapa.',
      enabled: true,
      panel: 'observation' as const,
    },
    {
      icon: 'sync_alt',
      title: 'Referir programa',
      description:
        'Cerrar etapa origen y crear etapa receptora sin reiniciar días.',
      enabled: false,
      panel: 'reference' as const,
    },
    {
      icon: 'fact_check',
      title: 'Ingreso a tratamiento',
      description: 'Registrar ingreso efectivo y detener KPI de espera.',
      enabled: false,
      panel: 'treatmentEntry' as const,
    },
    {
      icon: 'logout',
      title: 'Egreso / cierre',
      description: 'Cerrar episodio con motivo, observación y auditoría.',
      enabled: false,
      panel: 'egressClosure' as const,
    },
  ];

  readonly summaryNavigationItems: SummaryNavigationItem[] = [
    {
      id: 'demanda-actual',
      label: 'Demanda actual',
      icon: 'assignment',
    },
    {
      id: 'demandante',
      label: 'Demandante',
      icon: 'person',
    },
    {
      id: 'trayectoria',
      label: 'Trayectoria',
      icon: 'timeline',
    },
    {
      id: 'citaciones',
      label: 'Citaciones',
      icon: 'event',
    },
    {
      id: 'observaciones',
      label: 'Observaciones',
      icon: 'notes',
    },
    {
      id: 'documentos',
      label: 'Documentos',
      icon: 'description',
    },
    {
      id: 'alertas',
      label: 'Alertas',
      icon: 'notifications',
    },
  ];

  activeSummarySection: SummarySectionId = 'demanda-actual';

  @ViewChildren('summarySection', {
    read: ElementRef,
  })
  summarySections!: QueryList<ElementRef<HTMLElement>>;

  private summarySectionObserver: IntersectionObserver | null = null;

  @ViewChild('personEditSection', {
    read: ElementRef,
  })
  personEditSection?: ElementRef<HTMLElement>;

  @ViewChild('createEpisodeSection', {
    read: ElementRef,
  })
  private createEpisodeSection?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadActiveProgramContext();
    this.loadDemandCatalogs();
    this.loadActiveProfessionals();

    /*
     * Cuando el usuario cambia manualmente el tipo de previsión,
     * se debe limpiar la previsión seleccionada anteriormente.
     *
     * Cuando cargamos una persona desde patchPersonForm(),
     * usamos emitEvent: false para no entrar aquí.
     */
    this.personForm.get('intPrev')?.valueChanges.subscribe((id) => {
      this.filterConvPrevByIntPrev(Number(id), true);
    });

    this.citationForm
      .get('programProfessionalId')
      ?.valueChanges.subscribe((programProfessionalId) => {
        this.applySelectedProfessionalToCitation(Number(programProfessionalId));
      });
  }

  ngAfterViewInit(): void {
    this.summarySections.changes.subscribe(() => {
      queueMicrotask(() => {
        this.initializeSummarySectionObserver();
      });
    });

    queueMicrotask(() => {
      this.initializeSummarySectionObserver();
    });
  }

  ngOnDestroy(): void {
    this.summarySectionObserver?.disconnect();
    this.summarySectionObserver = null;

    if (this.summaryHighlightTimeout) {
      clearTimeout(this.summaryHighlightTimeout);
      this.summaryHighlightTimeout = null;
    }
  }

  onDemandPageScroll(event: Event): void {
    const container = event.target as HTMLElement | null;

    if (!container) {
      this.showBackToNavigation = false;
      return;
    }

    this.showBackToNavigation =
      !!this.selectedPerson && container.scrollTop > 550;
  }

  scrollToSummarySection(sectionId: SummarySectionId): void {
    const target = document.getElementById(sectionId);
    const navigation = document.getElementById('longitudinal-navigation');

    const scrollContainer = document.querySelector(
      '.demand-new-page',
    ) as HTMLElement | null;

    if (!target) {
      console.warn(`[DemandNew] No se encontró la sección: ${sectionId}`);
      return;
    }

    this.activeSummarySection = sectionId;
    this.highlightSummarySection(sectionId);

    const navigationHeight =
      sectionId === 'demandante' ? 16 : (navigation?.offsetHeight ?? 0) + 46;

    /*
     * Caso 1: el scroll está dentro de .demand-new-page.
     */
    if (
      scrollContainer &&
      scrollContainer.scrollHeight > scrollContainer.clientHeight
    ) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const targetTop =
        scrollContainer.scrollTop +
        targetRect.top -
        containerRect.top -
        navigationHeight;

      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });

      return;
    }

    /*
     * Caso 2: el scroll pertenece a la ventana.
     */
    const targetTop =
      window.scrollY + target.getBoundingClientRect().top - navigationHeight;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }

  scrollToLongitudinalNavigation(): void {
    const anchor = document.getElementById('longitudinal-navigation-anchor');

    const scrollContainer = document.querySelector(
      '.demand-new-page',
    ) as HTMLElement | null;

    if (!anchor) {
      console.warn(
        '[DemandNew] No se encontró el ancla de navegación longitudinal.',
      );
      return;
    }

    /*
     * Si la ficha tiene scroll interno, desplazamos ese contenedor.
     */
    if (
      scrollContainer &&
      scrollContainer.scrollHeight > scrollContainer.clientHeight
    ) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();

      const targetTop =
        scrollContainer.scrollTop + anchorRect.top - containerRect.top - 8;

      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    } else {
      /*
       * Respaldo para layouts donde el scroll pertenece a la ventana.
       */
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    this.showBackToNavigation = false;
  }

  private highlightSummarySection(sectionId: SummarySectionId): void {
    if (this.summaryHighlightTimeout) {
      clearTimeout(this.summaryHighlightTimeout);
    }

    this.highlightedSummarySection = sectionId;

    this.summaryHighlightTimeout = setTimeout(() => {
      this.highlightedSummarySection = null;
      this.summaryHighlightTimeout = null;
    }, 1600);
  }

  private initializeSummarySectionObserver(): void {
    this.summarySectionObserver?.disconnect();

    if (!this.summarySections?.length) {
      return;
    }

    const scrollContainer = document.querySelector(
      '.demand-new-page',
    ) as HTMLElement | null;

    this.summarySectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => {
            const firstDistance = Math.abs(first.boundingClientRect.top - 140);

            const secondDistance = Math.abs(
              second.boundingClientRect.top - 140,
            );

            return firstDistance - secondDistance;
          });

        const activeEntry = visibleEntries[0];

        if (!activeEntry) {
          return;
        }

        const sectionId = activeEntry.target.id as SummarySectionId;

        const sectionExists = this.summaryNavigationItems.some(
          (item) => item.id === sectionId,
        );

        if (sectionExists) {
          this.activeSummarySection = sectionId;
        }
      },
      {
        root: scrollContainer,
        rootMargin: '-110px 0px -60% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    this.summarySections.forEach((section) => {
      this.summarySectionObserver?.observe(section.nativeElement);
    });
  }

  trackSummaryNavigationItem(
    index: number,
    item: SummaryNavigationItem,
  ): SummarySectionId {
    return item.id;
  }

  private loadActiveProfessionals(): void {
    this.professionals = [];
    this.professionalsError = null;
    this.isLoadingProfessionals = true;

    this.programProfessionalService
      .getActive()
      .pipe(finalize(() => (this.isLoadingProfessionals = false)))
      .subscribe({
        next: (response: any) => {
          const items = extractArray(response);

          const activeProgramId = Number(
            this.tokenService.getActiveProgramId(),
          );

          this.professionals = items
            .map((item: any) => normalizeProfessionalForCitation(item))
            .filter((item: any) => {
              const isActive =
                !!item.id && !item.deletedAt && item.active !== false;

              const belongsToActiveProgram =
                activeProgramId > 0 &&
                Array.isArray(item.programIds) &&
                item.programIds.some(
                  (programId: number) => Number(programId) === activeProgramId,
                );

              return isActive && belongsToActiveProgram;
            })
            .sort((a: any, b: any) =>
              String(a.name).localeCompare(String(b.name), 'es', {
                sensitivity: 'base',
              }),
            );

          if (!this.professionals.length) {
            this.professionalsError =
              activeProgramId > 0
                ? 'No hay facultativos activos asociados al programa actual.'
                : 'No fue posible identificar el programa activo.';
          }
        },
        error: (error) => {
          console.error(
            '[DemandNew] Error cargando facultativos activos:',
            error,
          );

          this.professionals = [];
          this.professionalsError =
            'No fue posible cargar los facultativos activos.';
        },
      });
  }

  private applySelectedProfessionalToCitation(professionalId: number): void {
    if (!professionalId) {
      this.citationForm.patchValue(
        {
          professionName: '',
        },
        { emitEvent: false },
      );
      return;
    }

    const selected = this.professionals.find(
      (item) => Number(item.id) === Number(professionalId),
    );

    if (!selected) {
      return;
    }

    this.citationForm.patchValue(
      {
        professionName: selected.professionName || '',
      },
      { emitEvent: false },
    );
  }

  private loadDemandCatalogs(): void {
    this.isLoadingDemandCatalogs = true;
    this.demandCatalogsError = '';

    this.demandService.getCatalogs().subscribe({
      next: (catalogs) => {
        this.demandCatalogs = catalogs;

        this.episodeTypes = catalogs.episodeTypes ?? [];
        this.eventTypes = catalogs.eventTypes ?? [];
        this.attendanceStatuses = catalogs.attendanceStatuses ?? [];
        this.closureReasons = catalogs.closureReasons ?? [];
        this.programPopulations = catalogs.programPopulations ?? [];
        this.programModalities = catalogs.programModalities ?? [];
        this.programPlans = catalogs.programPlans ?? [];
        this.regions = catalogs.regions ?? [];
        this.cities = catalogs.cities ?? [];

        this.isLoadingDemandCatalogs = false;
      },
      error: (error) => {
        console.error('Error cargando catálogos de demanda', error);
        this.demandCatalogsError =
          'No fue posible cargar los catálogos de demanda desde el backend.';

        this.isLoadingDemandCatalogs = false;
      },
    });
  }

  private loadCatalogs(): void {
    this.preloadCatalogs.loadAll().subscribe({
      next: (data) => {
        this.sexes = data.sexes ?? [];
        this.communes = data.communes ?? [];
        this.intPrev = data.intPrev ?? [];
        this.convPrev = data.convPrev ?? [];
        this.filteredConvPrev = [];
        this.substances = data.substances ?? [];
        this.contactTypes = data.contactTypes ?? [];
        this.senders = data.senders ?? [];
        this.diverters = data.diverters ?? [];
        this.professions = data.professions?.content ?? data.professions ?? [];
      },
      error: () => {
        this.sexes = [];
        this.communes = [];
        this.intPrev = [];
        this.convPrev = [];
        this.filteredConvPrev = [];
        this.substances = [];
        this.contactTypes = [];
        this.senders = [];
        this.diverters = [];
        this.professions = [];
      },
    });
  }

  private loadActiveProgramContext(): void {
    this.activeProgramName = this.tokenService.getActiveProgram();
    this.activeProgramId = this.tokenService.getActiveProgramId();
  }

  private filterConvPrevByIntPrev(
    intPrevId: number,
    clearCurrentSelection = false,
  ): void {
    const convPrevControl = this.personForm.get('convPrev');

    if (!intPrevId) {
      this.filteredConvPrev = [];

      convPrevControl?.reset(null, {
        emitEvent: false,
      });

      convPrevControl?.disable({
        emitEvent: false,
      });

      return;
    }

    this.filteredConvPrev = filterConvPrevByIntPrevId(this.convPrev, intPrevId);

    convPrevControl?.enable({
      emitEvent: false,
    });

    if (clearCurrentSelection) {
      convPrevControl?.reset(null, {
        emitEvent: false,
      });

      return;
    }

    const currentConvPrevId = Number(convPrevControl?.value);

    if (!currentConvPrevId) {
      return;
    }

    const currentExists = this.filteredConvPrev.some(
      (item: any) => Number(item?.id) === currentConvPrevId,
    );

    if (!currentExists) {
      convPrevControl?.reset(null, {
        emitEvent: false,
      });
    }
  }

  showCreatePerson(): void {
    const rut = formatRut(this.searchForm.getRawValue().rut);

    this.personSaveError = null;
    this.showCreateEpisodeForm = false;
    this.showCreatePersonForm = true;

    this.personForm.patchValue({
      rut,
    });
  }

  openCreatePersonForm(): void {
    const rutControl = this.searchForm.get('rut');

    rutControl?.markAsTouched();
    rutControl?.updateValueAndValidity();

    if (!rutControl?.value) {
      this.searchError = 'Debe ingresar un RUN antes de crear una persona.';
      this.showCreatePersonForm = false;
      return;
    }

    if (rutControl.invalid) {
      this.searchError =
        'El RUN ingresado no es válido. Revise el número y el dígito verificador.';
      this.showCreatePersonForm = false;
      return;
    }

    const rut = formatRut(String(rutControl.value));

    if (!rut) {
      this.searchError = 'No fue posible validar el RUN ingresado.';
      this.showCreatePersonForm = false;
      return;
    }

    this.searchError = null;
    this.personNotFound = true;
    this.selectedPerson = null;
    this.showCreatePersonForm = true;

    this.personForm.reset();
    this.personForm.patchValue({ rut });

    this.personForm.get('rut')?.disable({ emitEvent: false });
  }

  openEditPersonForm(): void {
    if (!this.selectedPerson?.id) {
      this.personSaveError = 'No existe una persona seleccionada para editar.';
      return;
    }

    this.personSaveError = null;

    this.showDemandantDetails = false;
    this.showCreateEpisodeForm = false;
    this.showBackToNavigation = false;

    this.patchPersonForm(this.selectedPerson);

    this.personForm.markAsPristine();
    this.personForm.markAsUntouched();

    this.showCreatePersonForm = true;

    /*
     * Se esperan dos ciclos de renderizado:
     * 1. Angular procesa el *ngIf.
     * 2. El navegador calcula la posición real del card.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const section = this.personEditSection?.nativeElement;

        if (!section) {
          console.warn(
            '[DemandNew] No se encontró el card de edición de persona.',
          );
          return;
        }

        section.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });

        section.focus({
          preventScroll: true,
        });
      });
    });
  }

  closePersonForm(): void {
    if (this.isSavingPerson) {
      return;
    }

    this.personSaveError = null;
    this.showCreatePersonForm = false;

    if (this.selectedPerson) {
      this.patchPersonForm(this.selectedPerson);
      this.personForm.markAsPristine();
      this.personForm.markAsUntouched();
    }
  }

  searchPerson(): void {
    this.showDemandantDetails = false;
    this.searchForm.markAllAsTouched();

    if (this.isSearching) {
      return;
    }

    if (this.searchForm.invalid) {
      this.searchError = 'Debe ingresar un RUN antes de realizar la búsqueda.';
      return;
    }

    const rawRut = this.searchForm.getRawValue().rut?.trim();
    const rut = formatRut(rawRut);

    if (!rut) {
      return;
    }

    this.isSearching = true;
    this.searched = true;
    this.personNotFound = false;
    this.selectedPerson = null;
    this.searchError = null;
    this.personSaveError = null;
    this.longitudinalError = null;
    this.showCreatePersonForm = false;
    this.showCreateEpisodeForm = false;

    this.personLoaded = false;
    this.episodeLoaded = false;
    this.stageLoaded = false;
    this.stageVisualState = 'Pendiente de creación';

    this.filteredConvPrev = [];
    this.longitudinal = null;
    this.episodeEvents = [];
    this.createdEpisode = null;
    this.episodeSummary = null;

    this.episodeForm.reset({
      episodeTypeId: null,
      originalRequestDate: '',

      initialProgramId: null,
      initialProgramName: '',
      currentProgramName: '',

      contactType: null,
      sender: null,
      diverter: null,

      previousTreatmentNumber: 0,

      currentState: '',
      currentResult: '',
      initialObservation: '',

      primarySubstanceId: null,
      secondarySubstances: [],
    });
    this.secondarySubstanceMap = {};

    console.log('[DemandNew] RUN búsqueda longitudinal:', rut);

    this.demandEpisodeService.getLongitudinalByRut(rut).subscribe({
      next: (data) => {
        console.log('[DemandNew] Longitudinal recibido:', data);

        this.applyLongitudinalData(data);
        this.isSearching = false;
      },

      error: (error) => {
        console.error(
          '[DemandNew] Error consultando ficha longitudinal por RUN:',
          error,
        );

        /*
         * Si el longitudinal está bloqueado o no existe,
         * buscamos directamente la persona por RUN.
         */
        if (error?.status === 403 || error?.status === 404) {
          this.loadPersonFallbackByRut(rut, Number(error.status));
          return;
        }

        this.isSearching = false;
        this.searchError =
          'No fue posible consultar la ficha longitudinal. Intente nuevamente o contacte a soporte.';
      },
    });
  }

  private loadPersonFallbackByRut(
    rut: string,
    longitudinalStatus: number,
  ): void {
    console.log(
      '[DemandNew] Intentando recuperar persona directamente por RUN:',
      rut,
    );

    this.postulantService
      .getPersonByRut(rut)
      .pipe(
        switchMap((person) => {
          const personId = Number(person?.id);

          if (!personId) {
            return throwError(
              () => new Error('La persona recuperada no posee un ID válido.'),
            );
          }

          console.log(
            '[DemandNew] ID recuperado por RUN. Cargando ficha completa:',
            personId,
          );

          return this.postulantService.getById(personId);
        }),
        finalize(() => (this.isSearching = false)),
      )
      .subscribe({
        next: (person: Postulant) => {
          console.log('[DemandNew] Persona completa recuperada:', person);

          this.selectedPerson = person;
          this.personLoaded = true;
          this.personNotFound = false;

          this.showCreatePersonForm = false;
          this.showCreateEpisodeForm = false;
          this.showDemandantDetails = false;

          this.patchPersonForm(person);

          this.stageVisualState = 'Ficha longitudinal no disponible';

          this.searchError =
            longitudinalStatus === 403
              ? 'Se recuperaron los datos de la persona, pero actualmente no tiene autorización para consultar su ficha longitudinal.'
              : 'La persona está registrada, pero no posee una ficha longitudinal disponible.';
        },

        error: (personError) => {
          console.error(
            '[DemandNew] Error recuperando persona completa por RUN:',
            personError,
          );

          if (personError?.status === 404) {
            this.selectedPerson = null;
            this.personLoaded = false;
            this.personNotFound = true;

            // Solo cuando no existe se abre automáticamente.
            this.showCreatePersonForm = true;
            this.showCreateEpisodeForm = false;
            this.showDemandantDetails = false;

            this.personForm.reset();
            this.personForm.patchValue({ rut });

            this.stageVisualState = 'Persona no registrada';

            this.searchError =
              'No se encontró una persona registrada con ese RUN. Complete los datos para crearla.';

            return;
          }

          if (personError?.status === 403) {
            this.searchError =
              'No tiene permisos para consultar los datos completos de la persona.';
            return;
          }

          this.searchError =
            'No fue posible recuperar los datos completos de la persona.';
        },
      });
  }

  createEpisode(): void {
    if (this.createdEpisode || this.episodeLoaded) {
      this.episodeSaveError =
        'Ya existe un episodio asociado a esta persona. No se puede crear un nuevo episodio activo.';
      return;
    }

    if (!this.selectedPerson?.id) {
      this.episodeSaveError =
        'Debe existir una persona seleccionada para crear el episodio.';
      return;
    }

    if (this.episodeForm.invalid) {
      this.episodeForm.markAllAsTouched();
      this.episodeSaveError =
        'Complete los campos obligatorios antes de crear el episodio.';
      return;
    }

    const activeProgramId = Number(this.tokenService.getActiveProgramId());

    if (!Number.isFinite(activeProgramId) || activeProgramId <= 0) {
      this.episodeSaveError =
        'No fue posible identificar el programa activo para crear el episodio.';
      return;
    }

    const responsibleUserId = Number(this.tokenService.getUserId());

    if (!Number.isFinite(responsibleUserId) || responsibleUserId <= 0) {
      this.episodeSaveError =
        'No fue posible identificar al usuario responsable.';
      return;
    }

    const raw = this.episodeForm.getRawValue();

    const payload = {
      postulantId: Number(this.selectedPerson.id),
      initialProgramId: activeProgramId,

      episodeTypeId: Number(raw.episodeTypeId),

      originalRequestDate:
        toStringOrNull(raw.originalRequestDate) ?? getTodayForDateInput(),

      responsibleUserId,

      contactTypeId: Number(raw.contactType),

      senderId: raw.sender ? Number(raw.sender) : null,

      diverterId: raw.diverter ? Number(raw.diverter) : null,

      initialObservation: toStringOrNull(raw.initialObservation),
    };

    this.isSavingEpisode = true;
    this.episodeSaveError = null;

    console.log('[DemandNew] Payload creación episodio:', payload);

    this.demandEpisodeService
      .createEpisode(payload)
      .pipe(
        finalize(() => {
          this.isSavingEpisode = false;
        }),
      )
      .subscribe({
        next: (episode) => {
          console.log('[DemandNew] Episodio creado:', episode);

          this.createdEpisode = episode;
          this.episodeSummary = episode;
          this.episodeLoaded = true;

          this.stageLoaded = Boolean(
            episode?.currentStageId ??
            episode?.currentStage?.id ??
            episode?.stageId,
          );

          this.showCreateEpisodeForm = false;

          this.stageVisualState = this.stageLoaded
            ? 'Etapa inicial creada'
            : 'Episodio creado';

          this.episodeForm.patchValue({
            episodeTypeId:
              episode?.episodeType?.id ??
              episode?.episodeTypeId ??
              raw.episodeTypeId,

            originalRequestDate:
              episode?.originalRequestDate ?? raw.originalRequestDate,

            initialProgramId:
              episode?.initialProgram?.id ??
              episode?.initialProgramId ??
              activeProgramId,

            initialProgramName:
              episode?.initialProgram?.name ?? this.activeProgramName ?? '',

            currentProgramName:
              episode?.currentProgram?.name ??
              episode?.initialProgram?.name ??
              this.activeProgramName ??
              '',

            currentState:
              episode?.state?.name ??
              episode?.stateName ??
              episode?.stateCode ??
              'EN TRÁMITE',

            currentResult:
              episode?.result?.name ??
              episode?.resultName ??
              episode?.resultCode ??
              'AÚN SIN RESULTADO',

            initialObservation:
              episode?.initialObservation ?? raw.initialObservation ?? '',
          });

          this.episodeForm.markAsPristine();
          this.episodeForm.markAsUntouched();

          /*
           * No cargar todavía el longitudinal.
           * El endpoint continúa respondiendo 403.
           *
           * const episodeId = Number(
           *   episode?.id ?? episode?.episodeId,
           * );
           *
           * if (Number.isFinite(episodeId) && episodeId > 0) {
           *   this.loadEpisodeLongitudinal(episodeId);
           * }
           */
        },

        error: (error: HttpErrorResponse) => {
          console.error('[DemandNew] Error creando episodio:', error);

          if (error.status === 403) {
            this.episodeSaveError =
              'El backend rechazó la creación del episodio por permisos.';
            return;
          }

          if (error.status === 409) {
            this.episodeSaveError =
              error.error?.message || 'La persona ya tiene un episodio activo.';
            return;
          }

          if (error.status === 400) {
            this.episodeSaveError =
              error.error?.message ||
              'Los datos enviados para crear el episodio no son válidos.';
            return;
          }

          if (
            error.status === 0 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504
          ) {
            this.episodeSaveError =
              'El servicio de Gestión de Demanda no se encuentra disponible.';
            return;
          }

          this.episodeSaveError =
            error.error?.message ||
            'No fue posible crear el episodio. Revise los datos e intente nuevamente.';
        },
      });
  }

  showCreateEpisode(): void {
    if (!this.selectedPerson?.id) {
      this.episodeSaveError =
        'Debe seleccionar una persona antes de crear el episodio.';
      return;
    }

    if (this.createdEpisode || this.episodeLoaded) {
      this.episodeSaveError =
        'Ya existe un episodio asociado a esta persona. No se puede preparar uno nuevo hasta validar cierre o reversa.';
      return;
    }

    const activeProgramId = Number(this.tokenService.getActiveProgramId());

    if (!Number.isFinite(activeProgramId) || activeProgramId <= 0) {
      this.episodeSaveError = 'No fue posible identificar el programa activo.';
      return;
    }

    this.episodeSaveError = null;
    this.showCreatePersonForm = false;

    this.prepareCreateEpisodeForm(activeProgramId);

    this.showCreateEpisodeForm = true;

    setTimeout(() => {
      const section = this.createEpisodeSection?.nativeElement;

      if (!section) {
        return;
      }

      const scrollContainer = document.querySelector(
        '.demand-new-page',
      ) as HTMLElement | null;

      if (
        scrollContainer &&
        scrollContainer.scrollHeight > scrollContainer.clientHeight
      ) {
        const containerRect = scrollContainer.getBoundingClientRect();

        const sectionRect = section.getBoundingClientRect();

        const targetTop =
          scrollContainer.scrollTop + sectionRect.top - containerRect.top - 18;

        scrollContainer.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        });
      } else {
        section.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }

      section.focus({
        preventScroll: true,
      });
    }, 120);
  }

  private prepareCreateEpisodeForm(activeProgramId: number): void {
    const currentOriginalRequestDate =
      this.episodeForm.controls.originalRequestDate.value;

    this.episodeForm.patchValue({
      originalRequestDate: currentOriginalRequestDate || getTodayForDateInput(),

      initialProgramId: activeProgramId,

      initialProgramName: this.activeProgramName ?? '',

      currentProgramName: this.activeProgramName ?? '',

      currentState: 'EN TRÁMITE',
      currentResult: 'AÚN SIN RESULTADO',

      previousTreatmentNumber: 0,
    });

    this.episodeForm.markAsPristine();
    this.episodeForm.markAsUntouched();
  }

  closeCreateEpisodeForm(): void {
    if (this.isSavingEpisode) {
      return;
    }

    this.episodeSaveError = null;
    this.showCreateEpisodeForm = false;

    this.episodeForm.markAsPristine();
    this.episodeForm.markAsUntouched();
  }

  selectPrimarySubstance(id: number): void {
    this.episodeForm.patchValue({
      primarySubstanceId: id,
    });

    if (this.secondarySubstanceMap[id]) {
      delete this.secondarySubstanceMap[id];
      this.reorderSecondarySubstances();
    }

    this.syncSecondarySubstances();
  }

  toggleSecondarySubstance(id: number): void {
    const primaryId = this.episodeForm.getRawValue().primarySubstanceId;

    if (Number(primaryId) === Number(id)) return;

    if (this.secondarySubstanceMap[id]) {
      delete this.secondarySubstanceMap[id];
    } else {
      const max = Math.max(0, ...Object.values(this.secondarySubstanceMap));
      this.secondarySubstanceMap[id] = max + 1;
    }

    this.reorderSecondarySubstances();
    this.syncSecondarySubstances();
  }

  getSecondarySubstanceOrder(id: number): number | null {
    return this.secondarySubstanceMap[id] ?? null;
  }

  private reorderSecondarySubstances(): void {
    this.secondarySubstanceMap = reorderSecondarySubstanceMap(
      this.secondarySubstanceMap,
    );
  }

  private syncSecondarySubstances(): void {
    this.episodeForm.patchValue({
      secondarySubstances: buildSecondarySubstances(this.secondarySubstanceMap),
    });
  }

  savePerson(): void {
    if (this.personForm.invalid || this.isSavingPerson) {
      this.personForm.markAllAsTouched();
      return;
    }

    const raw = this.personForm.getRawValue();

    const userId = Number(this.tokenService.getUserId());

    if (!Number.isFinite(userId) || userId <= 0) {
      this.personSaveError =
        'No fue posible identificar el usuario autenticado para guardar la persona.';
      return;
    }

    if (!raw.rut) {
      this.personSaveError = 'El RUN de la persona es obligatorio.';
      return;
    }

    if (!raw.commune) {
      this.personSaveError = 'Debe seleccionar una comuna.';
      return;
    }

    if (!raw.sex) {
      this.personSaveError = 'Debe seleccionar sexo.';
      return;
    }

    /*
     * Correspondencia del formulario con Postulant:
     *
     * raw.firstName       -> firstName
     * raw.secondName      -> lastName
     * raw.firstLastName   -> firstLastName
     * raw.secondLastName  -> secondLastName
     * raw.birthDate       -> birthdate
     */
    const payload: Partial<Postulant> = {
      user: {
        id: userId,
      },

      commune: {
        id: Number(raw.commune),
      },

      sex: {
        id: Number(raw.sex),
      },

      firstName: toStringOrNull(raw.firstName),

      /*
       * En Postulant, lastName representa
       * el segundo nombre de la persona.
       */
      lastName: toStringOrNull(raw.secondName),

      firstLastName: toStringOrNull(raw.firstLastName),

      secondLastName: toStringOrNull(raw.secondLastName),

      rut: formatRut(raw.rut),

      birthdate: formatDateForBackend(raw.birthDate),

      email: toStringOrNull(raw.email),

      phone: toStringOrNull(raw.phone),

      address: toStringOrNull(raw.address),
    };

    /*
     * La institución previsional se encuentra
     * dentro del convenio previsional.
     */
    if (raw.convPrev && raw.intPrev) {
      payload.convPrev = {
        id: Number(raw.convPrev),

        intPrev: {
          id: Number(raw.intPrev),
        },
      };
    }

    const existingPersonId = Number(this.selectedPerson?.id);

    const saveRequest$ =
      Number.isFinite(existingPersonId) && existingPersonId > 0
        ? this.postulantService.update(existingPersonId, payload)
        : this.postulantService.create(payload);

    this.isSavingPerson = true;
    this.personSaveError = null;

    saveRequest$
      .pipe(
        /*
         * El PUT/POST puede devolver relaciones parciales.
         * Después de guardar consultamos el postulante completo.
         */
        switchMap((savedPerson: Postulant) => {
          const savedPersonId = Number(savedPerson?.id ?? existingPersonId);

          if (!Number.isFinite(savedPersonId) || savedPersonId <= 0) {
            return throwError(
              () =>
                new Error(
                  'El backend no devolvió un identificador válido del postulante.',
                ),
            );
          }

          return this.postulantService.getById(savedPersonId);
        }),

        finalize(() => {
          this.isSavingPerson = false;
        }),
      )
      .subscribe({
        next: (fullPostulant: Postulant) => {
          console.log(
            '[DemandNew] Persona completa después de guardar:',
            fullPostulant,
          );

          const previousPerson = this.selectedPerson;

          /*
           * Consolidamos por seguridad.
           *
           * GET /postulants/{id} tiene prioridad.
           * Se conservan relaciones anteriores cuando el GET
           * no las devuelve, por ejemplo convPrev.
           */
          const updatedPerson: Postulant = {
            ...(previousPerson ?? {}),
            ...fullPostulant,

            id: fullPostulant.id ?? previousPerson?.id,

            user: fullPostulant.user ?? previousPerson?.user ?? payload.user,

            commune: {
              ...(previousPerson?.commune ?? {}),
              ...(fullPostulant.commune ?? {}),

              id: Number(raw.commune),
            },

            sex: {
              ...(previousPerson?.sex ?? {}),
              ...(fullPostulant.sex ?? {}),

              id: Number(raw.sex),
            },

            firstName:
              fullPostulant.firstName ??
              payload.firstName ??
              previousPerson?.firstName ??
              null,

            /*
             * Segundo nombre del postulante.
             */
            lastName:
              fullPostulant.lastName ??
              payload.lastName ??
              previousPerson?.lastName ??
              null,

            firstLastName:
              fullPostulant.firstLastName ??
              payload.firstLastName ??
              previousPerson?.firstLastName ??
              null,

            secondLastName:
              fullPostulant.secondLastName ??
              payload.secondLastName ??
              previousPerson?.secondLastName ??
              null,

            rut:
              fullPostulant.rut ?? payload.rut ?? previousPerson?.rut ?? null,

            birthdate:
              fullPostulant.birthdate ??
              payload.birthdate ??
              previousPerson?.birthdate ??
              null,

            email:
              fullPostulant.email ??
              payload.email ??
              previousPerson?.email ??
              null,

            phone:
              fullPostulant.phone ??
              payload.phone ??
              previousPerson?.phone ??
              null,

            address:
              fullPostulant.address ??
              payload.address ??
              previousPerson?.address ??
              null,

            /*
             * El GET actual puede no devolver convPrev.
             * Conservamos los datos enviados en el formulario.
             */
            convPrev:
              raw.convPrev && raw.intPrev
                ? {
                    ...(previousPerson?.convPrev ?? {}),
                    ...(fullPostulant.convPrev ?? {}),

                    id: Number(raw.convPrev),

                    intPrev: {
                      ...(previousPerson?.convPrev?.intPrev ?? {}),
                      ...(fullPostulant.convPrev?.intPrev ?? {}),

                      id: Number(raw.intPrev),
                    },
                  }
                : (fullPostulant.convPrev ?? previousPerson?.convPrev),
          };

          this.selectedPerson = updatedPerson;

          this.personLoaded = true;
          this.personNotFound = false;
          this.personSaveError = null;

          /*
           * Reemplaza el postulante resumido dentro
           * de todos los niveles longitudinales.
           */
          if (this.longitudinal) {
            this.longitudinal = {
              ...this.longitudinal,

              postulant: updatedPerson,

              activeEpisode: this.longitudinal.activeEpisode
                ? {
                    ...this.longitudinal.activeEpisode,

                    postulant: updatedPerson,
                  }
                : this.longitudinal.activeEpisode,

              episodes: Array.isArray(this.longitudinal.episodes)
                ? this.longitudinal.episodes.map((episode: any) => ({
                    ...episode,
                    postulant: updatedPerson,
                  }))
                : this.longitudinal.episodes,
            };
          }

          if (this.episodeSummary) {
            this.episodeSummary = {
              ...this.episodeSummary,
              postulant: updatedPerson,
            };
          }

          /*
           * Carga el formulario usando únicamente
           * datos propios del Postulant.
           */
          this.patchPersonForm(updatedPerson);

          this.personForm.markAsPristine();
          this.personForm.markAsUntouched();

          this.showCreatePersonForm = false;
          this.showDemandantDetails = true;

          /*
           * Recarga el longitudinal para actualizar eventos,
           * etapas y episodios.
           *
           * loadEpisodeLongitudinal debe volver a obtener el
           * postulante completo o fusionarlo con selectedPerson.
           */
          const episodeId =
            Number(this.longitudinal?.activeEpisode?.id) ||
            Number(this.episodeSummary?.id) ||
            Number(this.episodeSummary?.episodeId) ||
            0;

          if (episodeId > 0) {
            this.loadEpisodeLongitudinal(episodeId);
          }
        },

        error: (error) => {
          console.error(
            '[DemandNew] Error guardando o recuperando persona:',
            error,
          );

          if (error?.status === 403) {
            this.personSaveError =
              'No tiene permisos para guardar los datos de la persona.';
            return;
          }

          if (error?.status === 409) {
            this.personSaveError =
              'Ya existe una persona registrada con este RUN.';
            return;
          }

          if (error?.status === 400) {
            this.personSaveError =
              error?.error?.message ?? 'Los datos enviados no son válidos.';
            return;
          }

          if (
            error?.status === 0 ||
            error?.status === 502 ||
            error?.status === 503 ||
            error?.status === 504
          ) {
            this.personSaveError =
              'El servicio no respondió correctamente. Intente nuevamente en unos minutos.';
            return;
          }

          this.personSaveError =
            'No fue posible guardar o recuperar todos los datos de la persona.';
        },
      });
  }

  saveInterview(): void {
    if (!this.ensureCanManageCurrentEpisode()) {
      return;
    }
    this.interviewForm.markAllAsTouched();

    if (this.interviewForm.invalid || this.isSavingInterview) {
      return;
    }

    const episodeId = getCurrentEpisodeId(
      this.createdEpisode,
      this.episodeSummary,
    );

    if (!episodeId) {
      this.interviewError =
        'No fue posible identificar el episodio para registrar entrevista.';
      return;
    }

    const programId = this.tokenService.getActiveProgramId();

    if (!programId) {
      this.interviewError =
        'No fue posible identificar el programa activo para registrar entrevista.';
      return;
    }

    const raw = this.interviewForm.getRawValue();

    const eventTime = buildEventTime(
      toStringOrNull(raw.eventHour),
      toStringOrNull(raw.eventPeriod) ?? 'AM',
    );

    const payload = {
      eventTypeCode: 'ENTREVISTA',
      eventDate:
        toStringOrNull(raw.eventDate) ?? new Date().toISOString().slice(0, 10),
      eventTime,
      programId: Number(programId),
      comment: toStringOrNull(raw.comment),
      observation: toStringOrNull(raw.observation),
      nextAction: toStringOrNull(raw.nextAction),
      nextActionDate: toBackendDate(raw.nextActionDate),
    };

    console.log('[DemandNew] Payload entrevista:', payload);
    console.log('[DemandNew] Episodio:', episodeId);

    this.isSavingInterview = true;
    this.interviewError = null;
    this.interviewSuccess = null;

    this.demandEpisodeService
      .createEvent(episodeId, payload)
      .pipe(finalize(() => (this.isSavingInterview = false)))
      .subscribe({
        next: (event) => {
          if (event?.id) {
            this.episodeEvents = [
              ...(this.episodeEvents ?? []).filter(
                (item: any) => Number(item.id) !== Number(event.id),
              ),
              event,
            ];
          }

          const interviewResult = handleInterviewSuccess(event);

          this.interviewSuccess = interviewResult.successMessage;
          this.interviewForm.reset(interviewResult.resetValue);

          this.loadEpisodeLongitudinal(episodeId);
        },
        error: (error) => {
          console.error('[DemandNew] Error registrando entrevista:', error);

          if (error?.status === 403) {
            this.interviewError =
              'No tiene permisos para registrar entrevista en el episodio.';
            return;
          }

          if (error?.status === 400) {
            this.interviewError =
              'No fue posible registrar la entrevista. Revise si el backend acepta eventTypeCode ENTREVISTA.';
            return;
          }

          this.interviewError =
            'No fue posible registrar la entrevista. Intente nuevamente.';
        },
      });
  }

  private patchPersonForm(person: Postulant): void {
    const birthDate = parseBackendDate(person.birthdate);

    this.personForm.patchValue({
      rut: person.rut ?? '',
      firstName: person.firstName ?? '',

      // En el modelo actual, el segundo nombre viene como lastName.
      secondName: person.lastName ?? '',

      firstLastName: person.firstLastName ?? '',
      secondLastName: person.secondLastName ?? '',
      birthDate,
      sex: person.sex?.id ?? null,
      phone: person.phone ?? '',
      email: person.email ?? '',
      address: person.address ?? '',
      commune: person.commune?.id ?? null,
      intPrev: person.convPrev?.intPrev?.id ?? null,
      convPrev: person.convPrev?.id ?? null,

      // Todavía no están disponibles directamente en Postulant.
      contactName: '',
      contactDescription: '',
      contactCellphone: '',
      contactEmail: '',
    });

    const intPrevId = person.convPrev?.intPrev?.id;

    if (intPrevId) {
      this.filterConvPrevByIntPrev(Number(intPrevId));

      this.personForm.patchValue({
        convPrev: person.convPrev?.id ?? null,
      });
    }
  }

  saveObservation(): void {
    if (!this.ensureCanManageCurrentEpisode()) {
      return;
    }
    this.observationForm.markAllAsTouched();

    if (this.observationForm.invalid || this.isSavingObservation) return;

    const episodeId = getCurrentEpisodeId(
      this.createdEpisode,
      this.episodeSummary,
    );

    if (!episodeId) {
      this.observationError =
        'No fue posible identificar el episodio para registrar la observación.';
      return;
    }

    const programId = this.tokenService.getActiveProgramId();

    if (!programId) {
      this.observationError =
        'No fue posible identificar el programa activo para registrar la observación.';
      return;
    }

    const raw = this.observationForm.getRawValue();

    const payload = {
      eventTypeCode: 'OBSERVACION',
      eventDate: new Date().toISOString().slice(0, 10),
      programId: Number(programId),
      comment: toStringOrNull(raw.comment),
      observation: toStringOrNull(raw.observation),
    };

    this.isSavingObservation = true;
    this.observationError = null;
    this.observationSuccess = null;

    this.demandEpisodeService
      .createEvent(episodeId, payload)
      .pipe(finalize(() => (this.isSavingObservation = false)))
      .subscribe({
        next: (event) => {
          const observationResult = handleObservationSuccess(event);

          this.observationSuccess = observationResult.successMessage;
          this.observationForm.reset(observationResult.resetValue);

          this.loadEpisodeLongitudinal(episodeId);
        },
        error: (error) => {
          console.error('[DemandNew] Error registrando observación:', error);

          if (error?.status === 403) {
            this.observationError =
              'No tiene permisos para registrar observaciones en el episodio.';
            return;
          }

          this.observationError =
            'No fue posible registrar la observación. Revise los datos e intente nuevamente.';
        },
      });
  }

  private applyLongitudinalData(data: any): void {
    const summarizedPostulant =
      data?.postulant ?? data?.activeEpisode?.postulant ?? null;

    const activeEpisode = data?.activeEpisode ?? null;
    const stages = Array.isArray(data?.stages) ? data.stages : [];

    const events = Array.isArray(data?.events) ? data.events : [];

    /*
     * Primero conserva la respuesta longitudinal completa.
     * La persona resumida será reemplazada después por el GET completo.
     */
    this.longitudinal = data;
    this.episodeEvents = events;

    /*
     * =====================================================
     * EPISODIO ACTIVO
     * =====================================================
     */
    if (activeEpisode) {
      this.createdEpisode = activeEpisode;
      this.episodeSummary = activeEpisode;
      this.episodeLoaded = true;
      this.showCreateEpisodeForm = false;

      this.episodeForm.patchValue(
        {
          episodeTypeId:
            activeEpisode?.episodeType?.id ??
            activeEpisode?.episodeTypeId ??
            null,

          originalRequestDate:
            activeEpisode?.originalRequestDate ?? getTodayForDateInput(),

          initialProgramId:
            activeEpisode?.initialProgram?.id ??
            activeEpisode?.initialProgramId ??
            null,

          initialProgramName: activeEpisode?.initialProgram?.name ?? '',

          currentProgramName:
            activeEpisode?.currentProgram?.name ??
            activeEpisode?.initialProgram?.name ??
            '',

          currentState:
            activeEpisode?.state?.name ?? activeEpisode?.stateCode ?? '',

          currentResult:
            activeEpisode?.result?.name ?? activeEpisode?.resultCode ?? '',
        },
        {
          emitEvent: false,
        },
      );

      this.episodeForm.markAsPristine();
      this.episodeForm.markAsUntouched();
    } else {
      this.createdEpisode = null;
      this.episodeSummary = null;
      this.episodeLoaded = false;
      this.showCreateEpisodeForm = false;
    }

    /*
     * =====================================================
     * ETAPA ACTUAL
     * =====================================================
     */
    const currentStage =
      stages.find((stage: any) => stage?.current === true) ?? stages[0] ?? null;

    if (currentStage) {
      this.stageLoaded = true;

      this.stageVisualState = `Etapa activa: ${
        currentStage?.program?.name ?? 'Sin programa'
      } · ${currentStage?.daysInStage ?? 0} días`;
    } else {
      this.stageLoaded = false;
      this.stageVisualState = 'Sin etapa activa cargada';
    }

    /*
     * =====================================================
     * PERSONA
     * =====================================================
     *
     * El longitudinal entrega una versión resumida del
     * postulante. Por eso usamos su ID para consultar:
     *
     * GET /api/v1/postulants/{id}
     *
     * Esa consulta devuelve:
     * - lastName
     * - commune
     * - sex
     * - user completo o parcial
     * - demás datos propios del postulante
     */
    const postulantId = Number(summarizedPostulant?.id);

    if (!Number.isFinite(postulantId) || postulantId <= 0) {
      console.warn(
        '[DemandNew] El longitudinal no contiene un postulante válido:',
        summarizedPostulant,
      );

      this.selectedPerson = null;
      this.personLoaded = false;
      this.personNotFound = false;
      this.showCreatePersonForm = false;

      return;
    }

    this.postulantService.getById(postulantId).subscribe({
      next: (fullPostulant: Postulant) => {
        console.log(
          '[DemandNew] Postulante completo recuperado:',
          fullPostulant,
        );

        /*
         * Consolida por seguridad.
         *
         * El GET completo tiene prioridad, pero se conservan
         * propiedades del resumen que eventualmente no vengan.
         */
        const completePerson: Postulant = {
          ...summarizedPostulant,
          ...fullPostulant,

          id: fullPostulant?.id ?? summarizedPostulant?.id,

          firstName:
            fullPostulant?.firstName ?? summarizedPostulant?.firstName ?? null,

          /*
           * Segundo nombre del postulante.
           * No confundir con user.secondName.
           */
          lastName:
            fullPostulant?.lastName ?? summarizedPostulant?.lastName ?? null,

          firstLastName:
            fullPostulant?.firstLastName ??
            summarizedPostulant?.firstLastName ??
            null,

          secondLastName:
            fullPostulant?.secondLastName ??
            summarizedPostulant?.secondLastName ??
            null,

          rut: fullPostulant?.rut ?? summarizedPostulant?.rut ?? null,

          birthdate:
            fullPostulant?.birthdate ?? summarizedPostulant?.birthdate ?? null,

          email: fullPostulant?.email ?? summarizedPostulant?.email ?? null,

          phone: fullPostulant?.phone ?? summarizedPostulant?.phone ?? null,

          address:
            fullPostulant?.address ?? summarizedPostulant?.address ?? null,

          commune: fullPostulant?.commune ?? summarizedPostulant?.commune,

          sex: fullPostulant?.sex ?? summarizedPostulant?.sex,

          convPrev: fullPostulant?.convPrev ?? summarizedPostulant?.convPrev,

          user: fullPostulant?.user ?? summarizedPostulant?.user,
        };

        this.selectedPerson = completePerson;
        this.personLoaded = true;
        this.personNotFound = false;
        this.showCreatePersonForm = false;

        /*
         * Reemplaza el postulante resumido dentro de todos
         * los niveles de la ficha longitudinal.
         */
        this.longitudinal = {
          ...data,

          postulant: completePerson,

          activeEpisode: activeEpisode
            ? {
                ...activeEpisode,
                postulant: completePerson,
              }
            : null,

          episodes: Array.isArray(data?.episodes)
            ? data.episodes.map((episode: any) => ({
                ...episode,
                postulant: completePerson,
              }))
            : [],
        };

        /*
         * Actualiza también el resumen del episodio.
         */
        if (this.episodeSummary) {
          this.episodeSummary = {
            ...this.episodeSummary,
            postulant: completePerson,
          };
        }

        /*
         * Usa el método único de carga del formulario.
         * Allí secondName se obtiene desde person.lastName.
         */
        this.patchPersonForm(completePerson);

        this.personForm.markAsPristine();
        this.personForm.markAsUntouched();

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.initializeSummarySectionObserver();
          });
        });
      },

      error: (error) => {
        console.error(
          '[DemandNew] No fue posible recuperar el postulante completo:',
          error,
        );

        /*
         * Respaldo: permite mostrar al menos los datos resumidos.
         * No utiliza user.secondName para completar al postulante.
         */
        const fallbackPerson: Postulant = {
          id: summarizedPostulant?.id,

          firstName: summarizedPostulant?.firstName ?? null,

          lastName: summarizedPostulant?.lastName ?? null,

          firstLastName: summarizedPostulant?.firstLastName ?? null,

          secondLastName: summarizedPostulant?.secondLastName ?? null,

          rut: summarizedPostulant?.rut ?? null,

          birthdate: summarizedPostulant?.birthdate ?? null,

          email: summarizedPostulant?.email ?? null,

          phone: summarizedPostulant?.phone ?? null,

          address: summarizedPostulant?.address ?? null,

          commune: summarizedPostulant?.commune,

          sex: summarizedPostulant?.sex,

          convPrev: summarizedPostulant?.convPrev,

          user: summarizedPostulant?.user,
        };

        this.selectedPerson = fallbackPerson;
        this.personLoaded = true;
        this.personNotFound = false;
        this.showCreatePersonForm = false;

        this.longitudinal = {
          ...data,

          postulant: fallbackPerson,

          activeEpisode: activeEpisode
            ? {
                ...activeEpisode,
                postulant: fallbackPerson,
              }
            : null,

          episodes: Array.isArray(data?.episodes)
            ? data.episodes.map((episode: any) => ({
                ...episode,
                postulant: fallbackPerson,
              }))
            : [],
        };

        this.patchPersonForm(fallbackPerson);

        this.searchError =
          'La ficha longitudinal fue cargada, pero no fue posible recuperar todos los datos personales.';
      },
    });
  }

  loadEpisodeLongitudinal(episodeId: number): void {
    if (!episodeId) {
      return;
    }

    this.isLoadingLongitudinal = true;
    this.longitudinalError = null;

    this.demandEpisodeService
      .getLongitudinalByEpisodeId(episodeId)
      .pipe(
        finalize(() => {
          this.isLoadingLongitudinal = false;
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('[DemandNew] Longitudinal episodio:', response);

          const events = response?.events ?? [];

          /*
           * Diagnóstico de los eventos recibidos.
           */
          console.table(
            events.map((event: any) => ({
              id: event?.id,

              eventTypeCode:
                event?.eventType?.code ??
                event?.eventTypeCode ??
                event?.typeCode ??
                event?.code ??
                '',

              eventTypeName:
                event?.eventType?.name ?? event?.eventTypeName ?? '',

              eventDate: event?.eventDate,

              eventTime: event?.eventTime,

              relatedEventId:
                event?.relatedEventId ??
                event?.relatedEvent?.id ??
                event?.citationEventId ??
                event?.citation?.id ??
                event?.parentEventId ??
                '',

              attendanceStatusId:
                event?.attendanceStatus?.id ?? event?.attendanceStatusId ?? '',

              attendanceStatusName:
                event?.attendanceStatus?.name ??
                event?.attendanceStatusName ??
                '',

              comment: event?.comment,
            })),
          );

          /*
           * Obtiene solamente los eventos de asistencia.
           */
          const attendanceEvents = events.filter((event: any) => {
            const code = String(
              event?.eventType?.code ??
                event?.eventTypeCode ??
                event?.typeCode ??
                event?.code ??
                '',
            )
              .toUpperCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');

            return code === 'ASISTENCIA';
          });

          console.log('[DemandNew] Eventos ASISTENCIA:', attendanceEvents);

          /*
           * El longitudinal devuelve un postulante resumido.
           *
           * Prioridad:
           * 1. response.postulant
           * 2. response.activeEpisode.postulant
           */
          const responsePostulant = (response?.postulant ??
            response?.activeEpisode?.postulant ??
            null) as Partial<Postulant> | null;

          /*
           * Consolida el postulante recibido con selectedPerson.
           *
           * Esto impide que una respuesta longitudinal resumida
           * elimine lastName, commune, sex, convPrev o user.
           */
          let mergedPostulant: Postulant | null = null;

          if (responsePostulant) {
            mergedPostulant = {
              ...(this.selectedPerson ?? {}),
              ...responsePostulant,

              id: responsePostulant.id ?? this.selectedPerson?.id,

              user: responsePostulant.user ?? this.selectedPerson?.user,

              commune:
                responsePostulant.commune ?? this.selectedPerson?.commune,

              sex: responsePostulant.sex ?? this.selectedPerson?.sex,

              convPrev:
                responsePostulant.convPrev ?? this.selectedPerson?.convPrev,

              firstName:
                responsePostulant.firstName ?? this.selectedPerson?.firstName,

              /*
               * El backend utiliza lastName como segundo nombre.
               * El longitudinal actualmente puede no devolverlo.
               */
              lastName:
                responsePostulant.lastName ?? this.selectedPerson?.lastName,

              firstLastName:
                responsePostulant.firstLastName ??
                this.selectedPerson?.firstLastName,

              secondLastName:
                responsePostulant.secondLastName ??
                this.selectedPerson?.secondLastName,

              rut: responsePostulant.rut ?? this.selectedPerson?.rut,

              birthdate:
                responsePostulant.birthdate ?? this.selectedPerson?.birthdate,

              email: responsePostulant.email ?? this.selectedPerson?.email,

              phone: responsePostulant.phone ?? this.selectedPerson?.phone,

              address:
                responsePostulant.address ?? this.selectedPerson?.address,
            };
          } else if (this.selectedPerson) {
            mergedPostulant = {
              ...this.selectedPerson,
            };
          }

          /*
           * Mantiene sincronizada la persona seleccionada.
           */
          if (mergedPostulant) {
            this.selectedPerson = mergedPostulant;
            this.personLoaded = true;
            this.personNotFound = false;
          }

          /*
           * Mantiene toda la respuesta longitudinal,
           * pero reemplaza sus postulantes resumidos por
           * el objeto consolidado.
           */
          this.longitudinal = {
            ...response,

            postulant: mergedPostulant ?? response?.postulant,

            activeEpisode: response?.activeEpisode
              ? {
                  ...response.activeEpisode,

                  postulant:
                    mergedPostulant ?? response.activeEpisode.postulant,
                }
              : response?.activeEpisode,

            episodes: Array.isArray(response?.episodes)
              ? response.episodes.map((episode: any) => ({
                  ...episode,

                  postulant: mergedPostulant ?? episode?.postulant,
                }))
              : response?.episodes,
          };

          this.episodeEvents = events;

          /*
           * Mantiene actualizado el resumen del episodio.
           */
          if (response?.activeEpisode?.id) {
            this.episodeSummary = {
              ...this.episodeSummary,
              ...response.activeEpisode,

              postulant: mergedPostulant ?? response.activeEpisode.postulant,
            };

            this.episodeLoaded = true;

            this.stageLoaded = Boolean(response.activeEpisode.currentStageId);
          }

          /*
           * Actualiza el formulario solamente cuando existe
           * una persona consolidada.
           *
           * No se ejecuta mientras el usuario está editando,
           * para evitar sobrescribir cambios todavía no guardados.
           */
          if (mergedPostulant && !this.showCreatePersonForm) {
            this.patchPersonForm(mergedPostulant);

            this.personForm.markAsPristine();
            this.personForm.markAsUntouched();
          }

          /*
           * Reinicializa el observador una vez que Angular
           * haya renderizado las secciones longitudinales.
           */
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.initializeSummarySectionObserver();
            });
          });
        },

        error: (error) => {
          console.error('[DemandNew] Error cargando longitudinal:', error);

          if (error?.status === 403) {
            this.longitudinalError =
              'No tiene permisos para consultar el historial del episodio.';
            return;
          }

          if (error?.status === 404) {
            this.longitudinalError =
              'No se encontró el historial longitudinal del episodio.';
            return;
          }

          if (
            error?.status === 0 ||
            error?.status === 502 ||
            error?.status === 503 ||
            error?.status === 504
          ) {
            this.longitudinalError =
              'El servicio de Gestión de Demanda no respondió correctamente.';
            return;
          }

          this.longitudinalError =
            'No fue posible cargar el historial del episodio.';
        },
      });
  }

  openActionPanel(panel: ActiveActionPanel): void {
    /*
     * Permite cerrar el panel aunque el episodio pertenezca
     * actualmente a otro programa.
     */
    if (panel !== null && !this.ensureCanManageCurrentEpisode()) {
      return;
    }

    this.activeActionPanel = panel;

    this.citationError = null;
    this.citationSuccess = null;

    this.observationError = null;
    this.observationSuccess = null;

    this.attendanceError = null;
    this.attendanceSuccess = null;

    this.interviewError = null;
    this.interviewSuccess = null;

    if (panel === 'citation') {
      this.citationForm.reset({
        eventDate: new Date(),
        eventHour: '',
        eventPeriod: 'AM',
        programProfessionalId: null,
        professionName: '',
        comment: '',
        citationComment: '',
      });
    }

    if (panel === 'attendance') {
      this.attendanceForm.reset({
        citationEventId: this.pendingCitationEvents[0]?.id ?? null,
        attendanceStatusId: null,
        comment: '',
      });
    }

    if (panel === 'interview') {
      this.interviewForm.reset({
        eventDate: new Date(),
        eventHour: '',
        eventPeriod: 'AM',
        comment: '',
        observation: '',
        nextAction: '',
        nextActionDate: null,
      });
    }

    if (panel === 'observation') {
      this.observationForm.reset({
        comment: '',
        observation: '',
      });
    }
  }

  isExpiredCitation(item: any): boolean {
    return checkExpiredCitation(item);
  }

  isTodayCitation(item: any): boolean {
    return checkTodayCitation(item);
  }

  isFutureCitation(item: any): boolean {
    return checkFutureCitation(item);
  }

  get expiredPendingCitationEvents(): any[] {
    return this.pendingCitationEvents.filter((item: any) =>
      this.isExpiredCitation(item),
    );
  }

  getCitationNumber(item: any): number {
    return calculateCitationNumber(item, this.citationEvents);
  }

  getAttendanceForCitation(citation: any): any | null {
    return findAttendanceForCitation(citation, this.episodeEvents);
  }

  getCitationAttendanceLabel(citation: any): string {
    return resolveCitationAttendanceLabel(citation, this.episodeEvents);
  }

  get selectedAttendanceCitationIsExpired(): boolean {
    return (
      !!this.selectedAttendanceCitation &&
      this.isExpiredCitation(this.selectedAttendanceCitation)
    );
  }

  get currentPendingCitationEvents(): any[] {
    return this.pendingCitationEvents.filter(
      (item: any) => !this.isExpiredCitation(item),
    );
  }

  getCitationTemporalLabel(item: any): string {
    return resolveCitationTemporalLabel(item);
  }

  closeActionPanel(): void {
    this.activeActionPanel = null;
  }

  saveCitation(): void {
    if (!this.ensureCanManageCurrentEpisode()) {
      return;
    }
    this.citationForm.markAllAsTouched();

    if (this.citationForm.invalid || this.isSavingCitation) {
      return;
    }

    const episodeId = getCurrentEpisodeId(
      this.createdEpisode,
      this.episodeSummary,
    );

    if (!episodeId) {
      this.citationError =
        'No fue posible identificar el episodio para registrar la citación.';
      return;
    }

    const programId = this.tokenService.getActiveProgramId();

    if (!programId) {
      this.citationError =
        'No fue posible identificar el programa activo para registrar la citación.';
      return;
    }

    const raw = this.citationForm.getRawValue();

    const citationContext = buildCitationContext({
      raw,
      programId,
      longitudinal: this.longitudinal,
    });

    if (!citationContext.valid) {
      this.citationError = citationContext.errorMessage;
      return;
    }

    const payload = citationContext.payload;

    this.isSavingCitation = true;
    this.citationError = null;
    this.citationSuccess = null;

    this.demandEpisodeService
      .createEvent(episodeId, payload)
      .pipe(
        finalize(() => {
          this.isSavingCitation = false;
        }),
      )
      .subscribe({
        next: (event: any) => {
          const citationResult = handleCitationSuccess(event);

          this.citationSuccess =
            citationResult.successMessage;

          this.citationForm.reset(
            citationResult.resetValue,
          );

          this.loadEpisodeLongitudinal(episodeId);
        },

        error: (error: HttpErrorResponse) => {
          console.error('[DemandNew] Error registrando citación:', error);

          if (error.status === 403) {
            this.citationError =
              'No tiene permisos para registrar citaciones en el episodio.';
            return;
          }

          if (error.status === 400) {
            this.citationError =
              error.error?.message ||
              'Los datos de la citación no son válidos.';
            return;
          }

          this.citationError =
            'No fue posible registrar la citación. Revise los datos e intente nuevamente.';
        },
      });
  }

  saveAttendance(): void {
    if (!this.ensureCanManageCurrentEpisode()) {
      return;
    }

    this.attendanceForm.markAllAsTouched();

    if (this.attendanceForm.invalid || this.isSavingAttendance) {
      return;
    }

    const episodeId = getCurrentEpisodeId(
      this.createdEpisode,
      this.episodeSummary,
    );

    const programId = Number(this.tokenService.getActiveProgramId()) || null;
    const raw = this.attendanceForm.getRawValue();

    const selectedCitation = this.pendingCitationEvents.find(
      (item: any) => Number(item.id) === Number(raw.citationEventId),
    );

    const contextValidation = validateAttendanceContext({
      episodeId,
      programId,
      selectedCitation,
    });

    if (!contextValidation.valid) {
      this.attendanceError = contextValidation.errorMessage;
      return;
    }

    const {
      episodeId: validEpisodeId,
      programId: validProgramId,
      selectedCitation: validSelectedCitation,
    } = contextValidation;

    const payload = buildAttendancePayload({
      raw,
      selectedCitation: validSelectedCitation,
      programId: validProgramId,
      longitudinal: this.longitudinal,
    });

    console.log('[DemandNew] Payload asistencia:', payload);
    console.log('[DemandNew] Citación seleccionada:', validSelectedCitation);
    console.log('[DemandNew] Episodio:', validEpisodeId);

    this.isSavingAttendance = true;
    this.attendanceError = null;
    this.attendanceSuccess = null;

    this.demandEpisodeService
      .createEvent(validEpisodeId, payload)
      .pipe(
        finalize(() => {
          this.isSavingAttendance = false;
        }),
      )
      .subscribe({
        next: (event: any) => {
          logAttendanceResponse(event);
          const attendanceResult = handleAttendanceSuccess({
            event,
            episodeEvents: this.episodeEvents,

            resetForm: () => {
              this.attendanceForm.reset({
                citationEventId: null,
                attendanceStatusId: null,
                comment: '',
              });

              this.attendanceForm.markAsPristine();
              this.attendanceForm.markAsUntouched();
            },

            closePanel: () => {
              this.activeActionPanel = null;
            },

            reloadLongitudinal: () => {
              this.loadEpisodeLongitudinal(validEpisodeId);
            },
          });

          this.episodeEvents = attendanceResult.episodeEvents;
          this.attendanceSuccess = attendanceResult.successMessage;
        },

        error: (error: any) => {
          console.error('[DemandNew] Error registrando asistencia:', error);

          this.attendanceError = getAttendanceErrorMessage(error);
        },
      });
  }

  formatCitationHourInput(): void {
    const raw = String(this.citationForm.get('eventHour')?.value ?? '')
      .replace(/\D/g, '')
      .slice(0, 4);

    if (!raw) {
      this.citationForm.patchValue({ eventHour: '' }, { emitEvent: false });
      return;
    }

    let formatted = raw;

    if (raw.length >= 3) {
      formatted = `${raw.slice(0, raw.length - 2)}:${raw.slice(-2)}`;
    }

    if (formatted.length === 4 && formatted.startsWith('0') === false) {
      formatted = `0${formatted}`;
    }

    this.citationForm.patchValue(
      { eventHour: formatted },
      { emitEvent: false },
    );
  }

  formatInterviewHourInput(): void {
    const control = this.interviewForm.get('eventHour');
    const value = String(control?.value ?? '').trim();

    if (!value) {
      return;
    }

    const parts = value.split(':');

    if (parts.length !== 2) {
      return;
    }

    const hour = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minutes) ||
      hour < 1 ||
      hour > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return;
    }

    control?.setValue(
      `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    );
  }

  get lastEpisodeEvent(): any | null {
    const events = this.episodeEvents ?? [];

    if (!events.length) return null;

    return [...events].sort((a: any, b: any) => {
      const dateA = `${a.eventDate ?? ''}T${a.eventTime ?? '00:00:00'}`;
      const dateB = `${b.eventDate ?? ''}T${b.eventTime ?? '00:00:00'}`;

      return dateB.localeCompare(dateA);
    })[0];
  }

  get orderedEpisodeEvents(): any[] {
    const events = [...(this.episodeEvents ?? [])];

    return events.sort((a: any, b: any) => {
      const dateA = getEventSortDate(a);
      const dateB = getEventSortDate(b);

      return dateB - dateA;
    });
  }

  get filteredEpisodeEvents(): any[] {
    const events = this.orderedEpisodeEvents;

    if (this.historyTypeFilter === 'TODOS') {
      return events;
    }

    return events.filter((event: any) => {
      return this.getEventTypeCode(event) === this.historyTypeFilter;
    });
  }

  get visibleEpisodeEvents(): any[] {
    if (this.showAllHistory) {
      return this.filteredEpisodeEvents;
    }

    return this.filteredEpisodeEvents.slice(0, this.historyDisplayLimit);
  }

  get hiddenHistoryCount(): number {
    return Math.max(
      0,
      this.filteredEpisodeEvents.length - this.visibleEpisodeEvents.length,
    );
  }

  setHistoryTypeFilter(type: string): void {
    this.historyTypeFilter = type;
    this.showAllHistory = false;
  }

  toggleAllHistory(): void {
    this.showAllHistory = !this.showAllHistory;
  }

  getEventTypeCode(event: any): string {
    return String(
      event?.eventType?.code ??
        event?.eventTypeCode ??
        event?.typeCode ??
        event?.code ??
        '',
    )
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  getEventIcon(event: any): string {
    const code = this.getEventTypeCode(event);

    switch (code) {
      case 'CITACION':
      case 'NUEVA_CITACION':
        return 'event_available';

      case 'ASISTENCIA':
        return 'how_to_reg';

      case 'ENTREVISTA':
        return 'psychology';

      case 'OBSERVACION':
        return 'notes';

      case 'REFERENCIA':
        return 'sync_alt';

      case 'INGRESO':
        return 'fact_check';

      case 'EGRESO':
      case 'CIERRE':
        return 'logout';

      default:
        return 'assignment_turned_in';
    }
  }

  getEventCardClass(event: any): string {
    const code = this.getEventTypeCode(event);

    switch (code) {
      case 'CITACION':
      case 'NUEVA_CITACION':
        return 'event-card--citation';

      case 'ASISTENCIA':
        return 'event-card--attendance';

      case 'ENTREVISTA':
        return 'event-card--interview';

      case 'OBSERVACION':
        return 'event-card--observation';

      case 'REFERENCIA':
        return 'event-card--reference';

      case 'INGRESO':
        return 'event-card--entry';

      case 'EGRESO':
      case 'CIERRE':
        return 'event-card--closure';

      default:
        return 'event-card--default';
    }
  }

  getEventProfessionalName(event: any): string | null {
    return (
      event?.programProfessionalName ??
      event?.professionalName ??
      event?.programProfessional?.name ??
      event?.professional?.name ??
      event?.professionalUser?.name ??
      null
    );
  }

  getEventProfessionName(event: any): string | null {
    return event?.professionName ?? event?.profession?.name ?? null;
  }

  getRelatedCitation(event: any): any | null {
    const relatedEventId = Number(
      event?.relatedEventId ??
        event?.relatedEvent?.id ??
        event?.citationEventId ??
        null,
    );

    if (!relatedEventId) {
      return null;
    }

    return (
      this.citationEvents.find(
        (citation: any) => Number(citation.id) === relatedEventId,
      ) ?? null
    );
  }

  get citationEvents(): any[] {
    return (this.episodeEvents ?? [])
      .filter((event: any) => {
        const code = String(
          event?.eventType?.code ?? event?.eventTypeCode ?? '',
        )
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        return code === 'CITACION' || code === 'NUEVA_CITACION';
      })
      .sort((a: any, b: any) => {
        const dateA = `${a.eventDate ?? ''}T${a.eventTime ?? '00:00:00'}`;
        const dateB = `${b.eventDate ?? ''}T${b.eventTime ?? '00:00:00'}`;
        return dateB.localeCompare(dateA);
      });
  }

  get pendingCitationEvents(): any[] {
    return filterPendingCitationEvents(this.citationEvents, this.episodeEvents);
  }

  get selectedAttendanceCitation(): any | null {
    const selectedId = this.attendanceForm.getRawValue().citationEventId;

    return findSelectedAttendanceCitation(
      selectedId,
      this.pendingCitationEvents,
    );
  }

  formatCitationOptionDate(item: any): string {
    return resolveCitationOptionDate(item);
  }

  formatCitationOptionTime(item: any): string {
    return resolveCitationOptionTime(item);
  }

  getNextCitationNumberForActiveProgram(): number {
    return getNextCitationNumberForProgram(
      this.citationEvents,
      this.tokenService.getActiveProgramId(),
    );
  }

  getSemaphoreClass(value: string | null | undefined): string {
    return getSemaphoreCssClass(value);
  }

  getSemaphoreDescription(value: string | null | undefined): string {
    return getSemaphoreDescriptionText(value);
  }

  get hasActiveEpisode(): boolean {
    return !!getCurrentEpisodeId(this.createdEpisode, this.episodeSummary);
  }

  formatDisplayDate(value: any): string {
    return formatDisplayDateValue(value);
  }

  formatDisplayTime(value: any): string {
    return formatDisplayTimeValue(value);
  }

  toggleDemandantDetails(): void {
    this.showDemandantDetails = !this.showDemandantDetails;
    this.showBackToNavigation = false;

    if (this.showDemandantDetails) {
      queueMicrotask(() => {
        document
          .getElementById('demandant-full-details')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  get observationEvents(): any[] {
    return filterObservationEvents(this.episodeEvents);
  }

  get canManageCurrentEpisode(): boolean {
    return canManageEpisode(
      this.activeProgramId,
      this.tokenService.getActiveProgramId(),
      this.episodeSummary,
      this.longitudinal,
    );
  }

  get episodeProgramRestrictionMessage(): string {
    return getEpisodeProgramRestrictionMessage(
      this.canManageCurrentEpisode,
      this.episodeSummary,
      this.longitudinal,
    );
  }

  private ensureCanManageCurrentEpisode(): boolean {
    if (this.canManageCurrentEpisode) {
      return true;
    }

    this.longitudinalError = this.episodeProgramRestrictionMessage;

    this.activeActionPanel = null;

    return false;
  }
}
