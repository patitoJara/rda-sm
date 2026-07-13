import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
  FormGroup,
} from '@angular/forms';

import {
  AfterViewInit,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { HttpErrorResponse } from '@angular/common/http';

import { finalize } from 'rxjs/operators';
import { PostulantService } from '@app/services/postulant.service';
import { Postulant } from '@app/models/postulant';
import { PreloadCatalogsService } from '@app/services/demand/preload-catalogs.service';
import { TokenService } from '@app/services/token.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { DemandEpisodeService } from '@app/services/demand/demand-episode.service';
import { ProgramProfessionalService } from '@app/services/program-professional.service';

import {
  DemandCatalogItem,
  DemandCatalogsDTO,
  DemandService,
} from '../../core/services/demand.service';

type ActiveActionPanel =
  | 'citation'
  | 'attendance'
  | 'interview'
  | 'observation'
  | 'reference'
  | 'treatmentEntry'
  | 'egressClosure'
  | null;

type SummarySectionId =
  | 'demanda-actual'
  | 'demandante'
  | 'trayectoria'
  | 'citaciones'
  | 'observaciones'
  | 'documentos'
  | 'alertas';

interface SummaryNavigationItem {
  id: SummarySectionId;
  label: string;
  icon: string;
}

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

    birthDate: new FormControl<string>('', {
      nonNullable: true,
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
  });

  episodeForm = this.fb.group({
    episodeType: [{ value: '', disabled: true }],
    originalRequestDate: [{ value: '', disabled: true }],
    initialProgram: [{ value: '', disabled: true }],
    currentProgram: [{ value: '', disabled: true }],
    contactType: new FormControl<number | null>(null),
    sender: new FormControl<number | null>(null),
    diverter: new FormControl<number | null>(null),
    previousTreatmentNumber: [{ value: '', disabled: true }],
    currentState: [{ value: '', disabled: true }],
    currentResult: [{ value: '', disabled: true }],
    initialObservation: [''],

    primarySubstanceId: new FormControl<number | null>(null),
    secondarySubstances: new FormControl<
      { substanceId: number; order: number }[]
    >([]),
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

  @ViewChildren('summarySection')
  private summarySections!: QueryList<ElementRef<HTMLElement>>;

  private summarySectionObserver: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadActiveProgramContext();
    this.loadDemandCatalogs();
    this.loadActiveProfessionals();

    this.personForm.get('intPrev')?.valueChanges.subscribe((id) => {
      this.filterConvPrevByIntPrev(Number(id));
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
          const items = this.extractArray(response);

          this.professionals = items
            .map((item: any) => this.normalizeProfessionalForCitation(item))
            .filter(
              (item: any) =>
                !!item.id && !item.deletedAt && item.active !== false,
            )
            .sort((a: any, b: any) =>
              String(a.name).localeCompare(String(b.name), 'es', {
                sensitivity: 'base',
              }),
            );

          if (!this.professionals.length) {
            this.professionalsError =
              'No hay facultativos activos disponibles.';
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

  private normalizeProfessionalForCitation(raw: any): any {
    const programs = Array.isArray(raw?.programs)
      ? raw.programs
          .filter((program: any) => program && !program.deletedAt)
          .map((program: any) => ({
            id: Number(program.id),
            name: String(
              program.name ?? program.nombre ?? `Programa ${program.id}`,
            ),
          }))
      : [];

    const programIds = Array.isArray(raw?.programIds)
      ? raw.programIds
          .map((id: any) => Number(id))
          .filter((id: number) => Number.isFinite(id))
      : programs.map((program: any) => program.id);

    return {
      ...raw,
      id: Number(raw?.id ?? raw?.professionalUserId ?? raw?.userId),
      name:
        raw?.name ?? raw?.nombre ?? raw?.fullName ?? 'Facultativo sin nombre',
      professionId:
        raw?.professionId ?? raw?.profession_id ?? raw?.profession?.id ?? null,
      professionName:
        raw?.professionName ??
        raw?.profession_name ??
        raw?.profession?.name ??
        raw?.profession?.nombre ??
        '',
      email: raw?.email ?? null,
      phone: raw?.phone ?? raw?.telefono ?? null,
      active: raw?.active,
      deletedAt: raw?.deletedAt ?? raw?.deleted_at ?? null,
      programIds,
      programs,
      programNames: programs.map((program: any) => program.name).join(', '),
    };
  }

  private formatDateForBackend(
    value: Date | string | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
      }
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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

  private extractArray(raw: any): any[] {
    if (Array.isArray(raw)) {
      return raw;
    }

    if (Array.isArray(raw?.data)) {
      return raw.data;
    }

    if (Array.isArray(raw?.content)) {
      return raw.content;
    }

    if (Array.isArray(raw?.items)) {
      return raw.items;
    }

    if (Array.isArray(raw?.results)) {
      return raw.results;
    }

    return [];
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

  private filterConvPrevByIntPrev(intPrevId: number): void {
    this.personForm.get('convPrev')?.reset();

    if (!intPrevId) {
      this.filteredConvPrev = [];
      this.personForm.get('convPrev')?.disable();
      return;
    }

    this.filteredConvPrev = this.convPrev.filter((item: any) => {
      const relatedId =
        item?.intPrev?.id ?? item?.int_prev_id ?? item?.intPrevId;
      return Number(relatedId) === intPrevId;
    });

    this.personForm.get('convPrev')?.enable();
  }

  showCreatePerson(): void {
    const rut = this.formatRut(this.searchForm.getRawValue().rut);

    this.personSaveError = null;
    this.showCreateEpisodeForm = false;
    this.showCreatePersonForm = true;

    this.personForm.patchValue({
      rut,
    });
  }

  searchPerson(): void {
    this.showDemandantDetails = false;
    this.searchForm.markAllAsTouched();

    if (this.searchForm.invalid || this.isSearching) return;

    const rawRut = this.searchForm.getRawValue().rut?.trim();

    // IMPORTANTE:
    // Para el endpoint longitudinal, el RUN debe mantenerse con puntos y guion.
    // Ejemplo: 11.799.136-9
    const rut = this.formatRut(rawRut);

    if (!rut) return;

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
      episodeType: '',
      originalRequestDate: '',
      initialProgram: '',
      currentProgram: '',
      contactType: null,
      sender: null,
      diverter: null,
      previousTreatmentNumber: '',
      currentState: '',
      currentResult: '',
      initialObservation: '',
      primarySubstanceId: null,
      secondarySubstances: [],
    });

    this.secondarySubstanceMap = {};

    console.log('[DemandNew] RUN búsqueda longitudinal:', rut);

    this.demandEpisodeService
      .getLongitudinalByRut(rut)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (data) => {
          console.log('[DemandNew] Longitudinal recibido:', data);

          this.applyLongitudinalData(data);
        },
        error: (error) => {
          console.error(
            '[DemandNew] Error consultando ficha longitudinal por RUN:',
            error,
          );

          if (error?.status === 404) {
            this.personNotFound = true;
            this.showCreatePersonForm = false;
            this.showCreateEpisodeForm = false;
            this.stageVisualState = 'Sin historia longitudinal registrada';

            this.searchError =
              'No se encontró una persona registrada con ese RUN. Puede continuar creando una nueva persona.';

            return;
          }

          if (error?.status === 403) {
            this.searchError =
              'No tiene permisos para consultar la ficha longitudinal de demanda por RUN.';
            return;
          }

          this.searchError =
            'No fue posible consultar la ficha longitudinal. Intente nuevamente o contacte a soporte.';
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

    const activeProgramId = this.tokenService.getActiveProgramId();

    if (!activeProgramId) {
      this.episodeSaveError =
        'No fue posible identificar el programa activo para crear el episodio.';
      return;
    }

    const raw = this.episodeForm.getRawValue();

    const payload = {
      postulantId: Number(this.selectedPerson.id),
      initialProgramId: Number(activeProgramId),

      episodeTypeId: raw.episodeType ? Number(raw.episodeType) : null,
      originalRequestDate:
        this.toStringOrNull(raw.originalRequestDate) ??
        new Date().toISOString().slice(0, 10),

      responsibleUserId: this.tokenService.getUserId(),

      contactTypeId: raw.contactType ? Number(raw.contactType) : null,
      senderId: raw.sender ? Number(raw.sender) : null,
      diverterId: raw.diverter ? Number(raw.diverter) : null,

      initialObservation: this.toStringOrNull(raw.initialObservation),
    };

    this.isSavingEpisode = true;
    this.episodeSaveError = null;

    this.demandEpisodeService
      .createEpisode(payload)
      .pipe(finalize(() => (this.isSavingEpisode = false)))
      .subscribe({
        next: (episode) => {
          console.log('[DemandNew] Episodio creado:', episode);

          this.createdEpisode = episode;
          this.episodeSummary = episode;
          this.episodeLoaded = true;
          this.stageLoaded = !!episode?.currentStageId;
          this.showCreateEpisodeForm = false;

          this.stageVisualState = episode?.currentStageId
            ? `Etapa inicial creada: ${episode.currentStageId}`
            : 'Episodio creado sin etapa informada';

          this.episodeForm.patchValue({
            episodeType: episode?.episodeType?.id ?? raw.episodeType,
            originalRequestDate:
              episode?.originalRequestDate ?? raw.originalRequestDate,
            initialProgram: episode?.initialProgram?.name ?? '',
            currentProgram: episode?.currentProgram?.name ?? '',
            currentState: episode?.stateCode ?? '',
            currentResult: episode?.resultCode ?? '',
            initialObservation:
              episode?.initialObservation ?? raw.initialObservation ?? '',
          });
          const episodeId = Number(episode?.id ?? episode?.episodeId);

          if (Number.isFinite(episodeId) && episodeId > 0) {
            this.loadEpisodeLongitudinal(episodeId);
          }
        },
        error: (error) => {
          console.error('[DemandNew] Error creando episodio:', error);

          if (error?.status === 403) {
            this.episodeSaveError =
              'No tiene permisos para crear episodios en el backend.';
            return;
          }

          if (error?.status === 400 || error?.status === 409) {
            this.episodeSaveError =
              'No fue posible crear el episodio. Es posible que la persona ya tenga un episodio activo.';
            return;
          }

          this.episodeSaveError =
            'No fue posible crear el episodio. Revise los datos e intente nuevamente.';
        },
      });
  }

  showCreateEpisode(): void {
    if (this.createdEpisode || this.episodeLoaded) {
      this.episodeSaveError =
        'Ya existe un episodio asociado a esta persona. No se puede preparar uno nuevo hasta validar cierre o reversa.';
      return;
    }

    this.episodeSaveError = null;
    this.showCreateEpisodeForm = true;
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
    const ordered = Object.entries(this.secondarySubstanceMap).sort(
      (a, b) => a[1] - b[1],
    );

    this.secondarySubstanceMap = {};

    ordered.forEach(([key], index) => {
      this.secondarySubstanceMap[+key] = index + 1;
    });
  }

  private syncSecondarySubstances(): void {
    const arr = Object.entries(this.secondarySubstanceMap).map(
      ([id, order]) => ({
        substanceId: Number(id),
        order,
      }),
    );

    this.episodeForm.patchValue({
      secondarySubstances: arr,
    });
  }

  savePerson(): void {
    if (this.personForm.invalid || this.isSavingPerson) {
      this.personForm.markAllAsTouched();
      return;
    }

    const raw = this.personForm.getRawValue();

    const userId = this.tokenService.getUserId();

    if (!userId) {
      this.personSaveError =
        'No fue posible identificar el usuario autenticado para crear la persona.';
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

    const payload: Partial<Postulant> = {
      user: { id: Number(userId) },
      commune: { id: Number(raw.commune) },
      sex: { id: Number(raw.sex) },

      firstName: this.toStringOrNull(raw.firstName) ?? undefined,
      lastName: this.toStringOrNull(raw.secondName) ?? undefined,
      firstLastName: this.toStringOrNull(raw.firstLastName) ?? undefined,
      secondLastName: this.toStringOrNull(raw.secondLastName) ?? undefined,

      rut: this.formatRut(raw.rut),
      birthdate: this.toStringOrNull(raw.birthDate),

      email: this.toStringOrNull(raw.email) ?? undefined,
      phone: this.toStringOrNull(raw.phone) ?? undefined,
      address: this.toStringOrNull(raw.address) ?? undefined,
    };

    if (raw.convPrev && raw.intPrev) {
      payload.convPrev = {
        id: Number(raw.convPrev),
        intPrev: { id: Number(raw.intPrev) },
      };
    }

    this.isSavingPerson = true;
    this.personSaveError = null;

    this.postulantService
      .create(payload)
      .pipe(finalize(() => (this.isSavingPerson = false)))
      .subscribe({
        next: (created) => {
          this.selectedPerson = created;
          this.personLoaded = true;
          this.personNotFound = false;
          this.showCreatePersonForm = false;
          this.patchPersonForm(created);
        },
        error: (error) => {
          console.error('[DemandNew] Error guardando persona:', error);
          this.personSaveError =
            'No fue posible guardar la persona. Revise los datos e intente nuevamente.';
        },
      });
  }

  saveInterview(): void {
    this.interviewForm.markAllAsTouched();

    if (this.interviewForm.invalid || this.isSavingInterview) {
      return;
    }

    const episodeId = this.getCurrentEpisodeId();

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

    const eventTime = this.buildTime24From12Hour(
      this.toStringOrNull(raw.eventHour),
      this.toStringOrNull(raw.eventPeriod) ?? 'AM',
    );

    const payload = {
      eventTypeCode: 'ENTREVISTA',
      eventDate:
        this.toStringOrNull(raw.eventDate) ??
        new Date().toISOString().slice(0, 10),
      eventTime,
      programId: Number(programId),
      comment: this.toStringOrNull(raw.comment),
      observation: this.toStringOrNull(raw.observation),
      nextAction: this.toStringOrNull(raw.nextAction),
      nextActionDate: this.toBackendDate(raw.nextActionDate),
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
          console.log('[DemandNew] Entrevista registrada:', event);

          if (event?.id) {
            this.episodeEvents = [
              ...(this.episodeEvents ?? []).filter(
                (item: any) => Number(item.id) !== Number(event.id),
              ),
              event,
            ];
          }

          this.interviewSuccess = 'Entrevista registrada correctamente.';

          this.interviewForm.reset({
            eventDate: new Date(),
            eventHour: '',
            eventPeriod: 'AM',
            comment: '',
            observation: '',
            nextAction: '',
            nextActionDate: null,
          });
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

  private toStringOrNull(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? text : null;
  }

  private formatRut(value: string | null | undefined): string {
    const clean = String(value ?? '')
      .replace(/\./g, '')
      .replace(/-/g, '')
      .trim()
      .toUpperCase();

    if (clean.length < 2) {
      return clean;
    }

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
  }

  private patchPersonForm(person: Postulant): void {
    this.personForm.patchValue({
      rut: person.rut ?? '',
      firstName: person.firstName ?? '',
      secondName: person.lastName ?? '',
      firstLastName: person.firstLastName ?? '',
      secondLastName: person.secondLastName ?? '',
      birthDate: person.birthdate ?? '',
      sex: person.sex?.id ?? null,
      phone: person.phone ?? '',
      email: person.email ?? '',
      address: person.address ?? '',
      commune: person.commune?.id ?? null,
      intPrev: person.convPrev?.intPrev?.id ?? null,
      convPrev: person.convPrev?.id ?? null,
    });

    if (person.convPrev?.intPrev?.id) {
      this.filterConvPrevByIntPrev(Number(person.convPrev.intPrev.id));

      this.personForm.patchValue({
        convPrev: person.convPrev.id ?? null,
      });
    }
  }

  private getCurrentEpisodeId(): number | null {
    const id =
      this.createdEpisode?.id ??
      this.createdEpisode?.episodeId ??
      this.episodeSummary?.id ??
      this.episodeSummary?.episodeId ??
      null;

    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  saveObservation(): void {
    this.observationForm.markAllAsTouched();

    if (this.observationForm.invalid || this.isSavingObservation) return;

    const episodeId = this.getCurrentEpisodeId();

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
      comment: this.toStringOrNull(raw.comment),
      observation: this.toStringOrNull(raw.observation),
    };

    this.isSavingObservation = true;
    this.observationError = null;
    this.observationSuccess = null;

    this.demandEpisodeService
      .createEvent(episodeId, payload)
      .pipe(finalize(() => (this.isSavingObservation = false)))
      .subscribe({
        next: (event) => {
          console.log('[DemandNew] Observación registrada:', event);

          this.observationSuccess = 'Observación registrada correctamente.';

          this.observationForm.reset({
            comment: '',
            observation: '',
          });

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
    this.longitudinal = data;

    const postulant = data?.postulant ?? null;
    const activeEpisode = data?.activeEpisode ?? null;
    const stages = data?.stages ?? [];
    const events = data?.events ?? [];

    this.episodeEvents = events;

    if (postulant) {
      this.selectedPerson = postulant;
      this.personLoaded = true;
      this.personNotFound = false;
      this.showCreatePersonForm = false;

      this.personForm.patchValue({
        rut: postulant.rut ?? '',
        firstName: postulant.firstName ?? '',
        secondName: postulant.secondName ?? '',
        firstLastName: postulant.firstLastName ?? '',
        secondLastName: postulant.secondLastName ?? '',
        birthDate: postulant.birthdate ?? '',
        phone: postulant.phone ?? '',
        email: postulant.email ?? '',
        address: postulant.address ?? '',
      });
    }

    if (activeEpisode) {
      this.createdEpisode = activeEpisode;
      this.episodeSummary = activeEpisode;
      this.episodeLoaded = true;
      this.showCreateEpisodeForm = false;

      this.episodeForm.patchValue({
        episodeType: activeEpisode.episodeType?.name ?? '',
        originalRequestDate: activeEpisode.originalRequestDate ?? '',
        initialProgram: activeEpisode.initialProgram?.name ?? '',
        currentProgram: activeEpisode.currentProgram?.name ?? '',
        currentState: activeEpisode.stateCode ?? '',
        currentResult: activeEpisode.resultCode ?? '',
      });
    } else {
      this.createdEpisode = null;
      this.episodeSummary = null;
      this.episodeLoaded = false;
      this.showCreateEpisodeForm = true;
    }

    const currentStage =
      stages.find((stage: any) => stage.current === true) ?? stages[0] ?? null;

    if (currentStage) {
      this.stageLoaded = true;
      this.stageVisualState = `Etapa activa: ${currentStage.program?.name ?? 'Sin programa'} · ${currentStage.daysInStage ?? 0} días`;
    } else {
      this.stageLoaded = false;
      this.stageVisualState = 'Sin etapa activa cargada';
    }
  }

  loadEpisodeLongitudinal(episodeId: number): void {
    if (!episodeId) return;

    this.isLoadingLongitudinal = true;
    this.longitudinalError = null;

    this.demandEpisodeService
      .getLongitudinalByEpisodeId(episodeId)
      .pipe(finalize(() => (this.isLoadingLongitudinal = false)))
      .subscribe({
        next: (response) => {
          console.log('[DemandNew] Longitudinal episodio:', response);

          const events = response?.events ?? [];

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

          this.longitudinal = response;
          this.episodeEvents = events;
        },
        error: (error) => {
          console.error('[DemandNew] Error cargando longitudinal:', error);

          this.longitudinalError =
            error?.status === 403
              ? 'No tiene permisos para consultar el historial del episodio.'
              : 'No fue posible cargar el historial del episodio.';
        },
      });
  }

  openActionPanel(panel: ActiveActionPanel): void {
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

  private todayDateOnly(): string {
    return new Date().toISOString().slice(0, 10);
  }

  isExpiredCitation(item: any): boolean {
    const eventDate = String(item?.eventDate ?? '');

    if (!eventDate) {
      return false;
    }

    return eventDate < this.todayDateOnly();
  }

  isTodayCitation(item: any): boolean {
    const eventDate = String(item?.eventDate ?? '');

    if (!eventDate) {
      return false;
    }

    return eventDate === this.todayDateOnly();
  }

  isFutureCitation(item: any): boolean {
    const eventDate = String(item?.eventDate ?? '');

    if (!eventDate) {
      return false;
    }

    return eventDate > this.todayDateOnly();
  }

  get expiredPendingCitationEvents(): any[] {
    return this.pendingCitationEvents.filter((item: any) =>
      this.isExpiredCitation(item),
    );
  }

  getCitationNumber(item: any): number {
    const ordered = [...(this.citationEvents ?? [])].sort((a: any, b: any) => {
      const dateA = `${a.eventDate ?? ''}T${a.eventTime ?? '00:00:00'}`;
      const dateB = `${b.eventDate ?? ''}T${b.eventTime ?? '00:00:00'}`;

      return dateA.localeCompare(dateB);
    });

    const index = ordered.findIndex(
      (event: any) => Number(event.id) === Number(item.id),
    );

    return index >= 0 ? index + 1 : 0;
  }

  getAttendanceForCitation(citation: any): any | null {
    const citationId = Number(citation?.id);

    if (!citationId) {
      return null;
    }

    const citationDate = String(citation?.eventDate ?? '').trim();
    const citationTime = this.normalizeEventTime(citation?.eventTime);
    const citationProfession = this.normalizeText(
      citation?.professionName ?? citation?.profession?.name,
    );

    const attendanceEvents = (this.episodeEvents ?? [])
      .filter((event: any) => {
        const code = this.normalizeText(
          event?.eventType?.code ??
            event?.eventTypeCode ??
            event?.typeCode ??
            event?.code,
        );

        return code === 'ASISTENCIA';
      })
      .sort((a: any, b: any) => {
        const dateA = String(a?.createdAt ?? '');
        const dateB = String(b?.createdAt ?? '');
        return dateB.localeCompare(dateA);
      });

    return (
      attendanceEvents.find((event: any) => {
        const relatedEventId = Number(
          event?.relatedEventId ??
            event?.relatedEvent?.id ??
            event?.citationEventId ??
            event?.citation?.id ??
            event?.parentEventId,
        );

        return relatedEventId === citationId;
      }) ??
      attendanceEvents.find((event: any) => {
        const eventDate = String(event?.eventDate ?? '').trim();
        const eventTime = this.normalizeEventTime(event?.eventTime);
        const eventProfession = this.normalizeText(
          event?.professionName ?? event?.profession?.name,
        );

        return (
          eventDate === citationDate &&
          eventTime === citationTime &&
          (!citationProfession || eventProfession === citationProfession)
        );
      }) ??
      null
    );
  }

  private normalizeEventTime(value: any): string {
    return String(value ?? '')
      .trim()
      .slice(0, 5);
  }

  private normalizeText(value: any): string {
    return String(value ?? '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  getCitationAttendanceLabel(citation: any): string {
    const attendance = this.getAttendanceForCitation(citation);

    const statusFromAttendance =
      attendance?.attendanceStatus?.name ??
      attendance?.attendanceStatusName ??
      attendance?.attendanceStatus?.code ??
      attendance?.attendanceStatusCode ??
      null;

    const statusFromCitation =
      citation?.attendanceStatus?.name ??
      citation?.attendanceStatusName ??
      citation?.attendanceStatus?.code ??
      citation?.attendanceStatusCode ??
      null;

    return statusFromAttendance || statusFromCitation || 'Pendiente';
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
    if (this.isExpiredCitation(item)) {
      return 'Vencida pendiente';
    }

    if (this.isTodayCitation(item)) {
      return 'Citación de hoy';
    }

    if (this.isFutureCitation(item)) {
      return 'Próxima citación';
    }

    return 'Sin fecha';
  }

  closeActionPanel(): void {
    this.activeActionPanel = null;
  }

  saveCitation(): void {
    this.citationForm.markAllAsTouched();

    if (this.citationForm.invalid || this.isSavingCitation) {
      return;
    }

    const episodeId = this.getCurrentEpisodeId();

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

    const eventDate = this.formatDateForBackend(raw.eventDate);
    const eventTime = this.buildEventTime(raw.eventHour, raw.eventPeriod);

    if (!eventDate) {
      this.citationError =
        'Debe seleccionar una fecha válida para la citación.';
      return;
    }

    if (!eventTime) {
      this.citationError =
        'Debe ingresar una hora válida y seleccionar AM o PM.';
      return;
    }

    const stageId =
      this.longitudinal?.activeEpisode?.currentStageId ??
      this.longitudinal?.stages?.find((stage: any) => stage?.current)?.id ??
      null;

    if (!stageId) {
      this.citationError =
        'No fue posible identificar la etapa activa del episodio.';
      return;
    }

    const payload = {
      eventTypeCode: 'CITACION',
      eventDate,
      eventTime,
      stageId,
      programId: Number(programId),
      programProfessionalId: raw.programProfessionalId
        ? Number(raw.programProfessionalId)
        : null,
      professionName: this.toStringOrNull(raw.professionName),
      comment: this.toStringOrNull(raw.comment),
      citationComment: this.toStringOrNull(raw.citationComment),
    };

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
          console.log('[DemandNew] Citación registrada:', event);

          this.citationSuccess = 'Citación registrada correctamente.';

          this.citationForm.reset({
            eventDate: new Date(),
            eventHour: '',
            eventPeriod: 'AM',
            programProfessionalId: null,
            professionName: '',
            comment: '',
            citationComment: '',
          });

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
    this.attendanceForm.markAllAsTouched();

    if (this.attendanceForm.invalid || this.isSavingAttendance) {
      return;
    }

    const episodeId = this.getCurrentEpisodeId();

    if (!episodeId) {
      this.attendanceError =
        'No fue posible identificar el episodio para registrar asistencia.';
      return;
    }

    const programId = this.tokenService.getActiveProgramId();

    if (!programId) {
      this.attendanceError =
        'No fue posible identificar el programa activo para registrar asistencia.';
      return;
    }

    const raw = this.attendanceForm.getRawValue();

    const selectedCitation = this.pendingCitationEvents.find(
      (item: any) => Number(item.id) === Number(raw.citationEventId),
    );

    if (!selectedCitation) {
      this.attendanceError =
        'Debe seleccionar una citación válida para registrar asistencia.';
      return;
    }

    const payload = {
      eventTypeCode: 'ASISTENCIA',

      eventDate:
        this.toStringOrNull(selectedCitation?.eventDate) ??
        new Date().toISOString().slice(0, 10),

      eventTime: selectedCitation?.eventTime ?? null,

      stageId:
        this.longitudinal?.activeEpisode?.currentStageId ??
        this.longitudinal?.stages?.find((stage: any) => stage?.current)?.id ??
        null,

      programId: Number(programId),

      relatedEventId: raw.citationEventId ? Number(raw.citationEventId) : null,

      attendanceStatusId: raw.attendanceStatusId
        ? Number(raw.attendanceStatusId)
        : null,

      programProfessionalId:
        selectedCitation?.programProfessionalId ??
        selectedCitation?.programProfessional?.id ??
        null,

      professionName: this.toStringOrNull(selectedCitation?.professionName),

      comment: this.toStringOrNull(raw.comment),
    };

    console.log('[DemandNew] Payload asistencia:', payload);
    console.log('[DemandNew] Citación seleccionada:', selectedCitation);
    console.log('[DemandNew] Episodio:', episodeId);

    this.isSavingAttendance = true;
    this.attendanceError = null;
    this.attendanceSuccess = null;

    this.demandEpisodeService
      .createEvent(episodeId, payload)
      .pipe(
        finalize(() => {
          this.isSavingAttendance = false;
        }),
      )
      .subscribe({
        next: (event: any) => {
          console.log('[DemandNew] Respuesta asistencia registrada:', event);

          console.table([
            {
              id: event?.id,

              eventTypeCode:
                event?.eventType?.code ??
                event?.eventTypeCode ??
                event?.typeCode ??
                event?.code ??
                '',

              relatedEventId:
                event?.relatedEventId ??
                event?.relatedEvent?.id ??
                event?.citationEventId ??
                event?.citation?.id ??
                '',

              attendanceStatusId:
                event?.attendanceStatus?.id ?? event?.attendanceStatusId ?? '',

              attendanceStatusName:
                event?.attendanceStatus?.name ??
                event?.attendanceStatusName ??
                '',

              comment: event?.comment,
            },
          ]);

          if (event?.id) {
            this.episodeEvents = [
              ...(this.episodeEvents ?? []).filter(
                (item: any) => Number(item.id) !== Number(event.id),
              ),
              event,
            ];
          }

          this.attendanceSuccess = 'Asistencia registrada correctamente.';

          this.attendanceForm.reset({
            citationEventId: null,
            attendanceStatusId: null,
            comment: '',
          });

          this.attendanceForm.markAsPristine();
          this.attendanceForm.markAsUntouched();

          /*
           * Cerramos directamente el card.
           * No usamos closeActionPanel() porque todavía
           * isSavingAttendance puede continuar en true
           * hasta que se ejecute finalize().
           */
          this.activeActionPanel = null;

          /*
           * Recarga completa para actualizar:
           * - estado de asistencia de la citación;
           * - eventos registrados;
           * - citaciones pendientes;
           * - indicadores del episodio.
           */
          this.loadEpisodeLongitudinal(episodeId);
        },

        error: (error: any) => {
          console.error('[DemandNew] Error registrando asistencia:', error);

          if (error?.status === 403) {
            this.attendanceError =
              'No tiene permisos para registrar asistencia en el episodio.';
            return;
          }

          if (error?.status === 400) {
            this.attendanceError =
              error?.error?.message ||
              'No fue posible registrar la asistencia. Revise los datos ingresados.';
            return;
          }

          this.attendanceError =
            'No fue posible registrar la asistencia. Intente nuevamente.';
        },
      });
  }

  private buildEventTime(
    hourValue: string | null | undefined,
    period: string | null | undefined,
  ): string | null {
    const value = String(hourValue ?? '').trim();
    const selectedPeriod = String(period ?? '')
      .trim()
      .toUpperCase();

    if (!value || !selectedPeriod) return null;

    const parts = value.split(':');
    if (parts.length !== 2) return null;

    let hour = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (!Number.isFinite(hour) || !Number.isFinite(minutes)) return null;
    if (hour < 1 || hour > 12 || minutes < 0 || minutes > 59) return null;

    if (selectedPeriod === 'PM' && hour < 12) {
      hour += 12;
    }

    if (selectedPeriod === 'AM' && hour === 12) {
      hour = 0;
    }

    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }

  private buildTime24From12Hour(
    hourValue: string | null,
    periodValue: string | null,
  ): string | null {
    const hourText = String(hourValue ?? '').trim();
    const period = String(periodValue ?? 'AM')
      .toUpperCase()
      .trim();

    if (!hourText) {
      return null;
    }

    const parts = hourText.split(':');

    if (parts.length !== 2) {
      return null;
    }

    let hour = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minutes) ||
      hour < 1 ||
      hour > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    if (period === 'PM' && hour < 12) {
      hour += 12;
    }

    if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0',
    )}:00`;
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
      const dateA = this.getEventSortDate(a);
      const dateB = this.getEventSortDate(b);

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

  private getEventSortDate(event: any): number {
    const eventDate = String(event?.eventDate ?? '').trim();
    const eventTime = String(event?.eventTime ?? '00:00:00')
      .trim()
      .slice(0, 8);

    if (eventDate) {
      const parsed = new Date(`${eventDate}T${eventTime}`).getTime();

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const createdAt = new Date(event?.createdAt ?? '').getTime();

    return Number.isNaN(createdAt) ? 0 : createdAt;
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
    return this.citationEvents.filter((event: any) => {
      const hasAttendance = !!this.getAttendanceForCitation(event);

      if (hasAttendance) {
        return false;
      }

      const status = this.normalizeText(
        event?.attendanceStatus?.code ??
          event?.attendanceStatusCode ??
          event?.attendanceStatusName,
      );

      return (
        !status ||
        status === 'PENDIENTE' ||
        status === 'AGENDADO' ||
        status === 'SIN_ESTADO'
      );
    });
  }

  get selectedAttendanceCitation(): any | null {
    const selectedId = this.attendanceForm.getRawValue().citationEventId;

    if (!selectedId) {
      return null;
    }

    return (
      this.pendingCitationEvents.find(
        (item: any) => Number(item.id) === Number(selectedId),
      ) ?? null
    );
  }

  formatCitationOptionDate(item: any): string {
    const value = String(item?.eventDate ?? '');

    if (!value) {
      return 'Sin fecha';
    }

    const parts = value.split('-');

    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return value;
  }

  formatCitationOptionTime(item: any): string {
    const value = String(item?.eventTime ?? '');

    if (!value) {
      return 'Sin hora';
    }

    return value.slice(0, 5);
  }

  getNextCitationNumberForActiveProgram(): number {
    const activeProgramId = Number(this.tokenService.getActiveProgramId());

    if (!activeProgramId) {
      return 1;
    }

    const currentProgramCitations = this.citationEvents.filter((event: any) => {
      const eventProgramId =
        event?.program?.id ?? event?.programId ?? event?.program_id ?? null;

      return Number(eventProgramId) === activeProgramId;
    });

    return currentProgramCitations.length + 1;
  }

  getSemaphoreClass(value: string | null | undefined): string {
    const color = this.normalizeSemaphoreColor(value);

    if (color === 'ROJO') {
      return 'semaphore-red';
    }

    if (color === 'AMARILLO') {
      return 'semaphore-yellow';
    }

    if (color === 'VERDE') {
      return 'semaphore-green';
    }

    return 'semaphore-empty';
  }

  getSemaphoreDescription(value: string | null | undefined): string {
    const color = this.normalizeSemaphoreColor(value);

    if (color === 'ROJO') {
      return 'Atención prioritaria';
    }

    if (color === 'AMARILLO') {
      return 'Seguimiento preventivo';
    }

    if (color === 'VERDE') {
      return 'Dentro de plazo';
    }

    return 'Sin clasificación';
  }

  private normalizeSemaphoreColor(value: string | null | undefined): string {
    return String(value ?? '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  get hasActiveEpisode(): boolean {
    return !!this.getCurrentEpisodeId();
  }

  private toBackendDate(value: any): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    const text = String(value).trim();

    if (!text) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const parts = text.split('/');

    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];

      return `${year}-${month}-${day}`;
    }

    return text;
  }

  formatDisplayDate(value: any): string {
    if (!value) {
      return 'Sin fecha';
    }

    if (value instanceof Date) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();

      return `${day}/${month}/${year}`;
    }

    const text = String(value).trim();

    if (!text) {
      return 'Sin fecha';
    }

    // Formato backend: yyyy-MM-dd
    const onlyDate = text.slice(0, 10);
    const parts = onlyDate.split('-');

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return text;
  }

  formatDisplayTime(value: any): string {
    if (!value) {
      return 'Sin hora';
    }

    return String(value).trim().slice(0, 5);
  }

  toggleDemandantDetails(): void {
    this.showDemandantDetails = !this.showDemandantDetails;
  }

  get observationEvents(): any[] {
    return this.episodeEvents.filter(
      (event: any) => event?.eventType?.code === 'OBSERVACION',
    );
  }
}
