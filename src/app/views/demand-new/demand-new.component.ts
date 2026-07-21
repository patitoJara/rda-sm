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
  stageVisualState = 'Pendiente de creaciÃ³n';

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

    currentState: [{ value: 'EN TRÃMITE', disabled: true }],
    currentResult: [{ value: 'AÃšN SIN RESULTADO', disabled: true }],

    initialObservation: [''],

    primarySubstanceId: [null as number | null],
    secondarySubstances: [
      [] as Array<{
        substanceId: number;
        order: number;
      }>,
    ],
  });

  // Estados vacÃ­os reales: no mocks
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
    'TelÃ©fono',
    'Correo',
    'DirecciÃ³n',
    'Comuna',
    'PrevisiÃ³n',
  ];

  readonly episodeFields = [
    'CÃ³digo episodio',
    'Tipo episodio',
    'Fecha solicitud original',
    'Programa inicial',
    'Programa actual',
    'VÃ­a de ingreso',
    'Remitente',
    'Derivador',
    'NÃºmero de tratamiento previo',
    'Estado actual',
    'Resultado actual',
    'DÃ­as acumulados',
    'Fecha ingreso a tratamiento',
    'Fecha egreso',
    'Motivo cierre',
    'ObservaciÃ³n inicial',
  ];

  readonly stageFields = [
    'Programa responsable',
    'Orden de etapa',
    'Fecha recepciÃ³n',
    'Fecha cierre',
    'Estado de etapa',
    'Resultado de etapa',
    'Etapa actual',
    'Motivo cierre etapa',
    'ObservaciÃ³n cierre etapa',
  ];

  readonly structuralSections = [
    {
      icon: 'timeline',
      title: 'Eventos del episodio',
      subtitle:
        'Registro cronolÃ³gico de citaciones, entrevistas, observaciones, ingreso, egreso y cierre.',
      empty: 'No existen eventos registrados.',
      fields: [
        'Tipo evento',
        'Fecha evento',
        'Hora evento',
        'ProfesiÃ³n',
        'Profesional',
        'Estado citaciÃ³n',
        'Resultado asociado',
        'Comentario de citaciÃ³n',
        'ObservaciÃ³n general',
        'PrÃ³xima acciÃ³n',
        'Fecha prÃ³xima acciÃ³n',
        'Usuario que registra',
      ],
    },
    {
      icon: 'sync_alt',
      title: 'Referencias entre programas',
      subtitle:
        'Cierre de etapa origen y creaciÃ³n de etapa receptora sin reiniciar dÃ­as.',
      empty:
        'No existen referencias registradas. Las referencias conservarÃ¡n la fecha original y los dÃ­as acumulados.',
      fields: [
        'Programa origen',
        'Programa destino',
        'Fecha referencia',
        'Motivo referencia',
        'ObservaciÃ³n',
        'Documento asociado',
        'Usuario que registra',
        'Impacto de la referencia',
      ],
    },
    {
      icon: 'science',
      title: 'Sustancias',
      subtitle:
        'Sustancia principal, sustancias secundarias, nivel u orden y observaciÃ³n.',
      empty: 'No existen sustancias asociadas al episodio.',
      fields: [
        'Sustancia principal',
        'Sustancias secundarias',
        'Nivel / orden',
        'ObservaciÃ³n',
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
        'Alertas con prioridad, responsable, prÃ³xima acciÃ³n y estado de seguimiento.',
      empty: 'No existen alertas activas.',
      fields: [
        'Tipo alerta',
        'Nivel prioridad',
        'DescripciÃ³n',
        'AcciÃ³n realizada',
        'PrÃ³xima acciÃ³n',
        'Fecha comprometida',
        'Responsable',
        'Estado alerta',
      ],
    },
    {
      icon: 'verified_user',
      title: 'AuditorÃ­a / decisiones crÃ­ticas',
      subtitle:
        'Trazabilidad de cierres, referencias, ingresos, egresos, rectificaciones y reversiÃ³n superior.',
      empty:
        'Las decisiones crÃ­ticas quedarÃ¡n registradas con usuario, fecha y autorizaciÃ³n.',
      fields: [
        'AcciÃ³n crÃ­tica',
        'Valor anterior',
        'Valor nuevo',
        'Motivo',
        'Usuario que ejecuta',
        'Usuario que autoriza',
        'Fecha acciÃ³n',
        'ReversiÃ³n / rectificaciÃ³n',
      ],
    },
  ];

  readonly operativeActions = [
    {
      icon: 'event_available',
      title: 'Nueva citaciÃ³n',
      description:
        'Registrar fecha, hora, profesional y comentario de citaciÃ³n.',
      enabled: true,
      panel: 'citation' as const,
    },
    {
      icon: 'how_to_reg',
      title: 'Registrar asistencia',
      description:
        'Marcar si se presentÃ³, no se presentÃ³, reprogramÃ³ o quedÃ³ pendiente.',
      enabled: true,
      panel: 'attendance' as const,
    },
    {
      icon: 'psychology',
      title: 'Entrevista / evaluaciÃ³n',
      description:
        'Registrar entrevista, evaluaciÃ³n clÃ­nica/social o antecedentes relevantes.',
      enabled: true,
      panel: 'interview' as const,
    },
    {
      icon: 'notes',
      title: 'ObservaciÃ³n',
      description: 'Agregar observaciÃ³n general del episodio o etapa.',
      enabled: true,
      panel: 'observation' as const,
    },
    {
      icon: 'sync_alt',
      title: 'Referir programa',
      description:
        'Cerrar etapa origen y crear etapa receptora sin reiniciar dÃ­as.',
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
      description: 'Cerrar episodio con motivo, observaciÃ³n y auditorÃ­a.',
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
     * Cuando el usuario cambia manualmente el tipo de previsiÃ³n,
     * se debe limpiar la previsiÃ³n seleccionada anteriormente.
     *
     * Cuando cargamos una persona desde patchPersonForm(),
     * usamos emitEvent: false para no entrar aquÃ­.
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
      console.warn(`[DemandNew] No se encontrÃ³ la secciÃ³n: ${sectionId}`);
      return;
    }

    this.activeSummarySection = sectionId;
    this.highlightSummarySection(sectionId);

    const navigationHeight =
      sectionId === 'demandante' ? 16 : (navigation?.offsetHeight ?? 0) + 46;

    /*
     * Caso 1: el scroll estÃ¡ dentro de .demand-new-page.
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
        '[DemandNew] No se encontrÃ³ el ancla de navegaciÃ³n longitudinal.',
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

          const activeProgramId = Number(
            this.tokenService.getActiveProgramId(),
          );

          this.professionals = items
            .map((item: any) => this.normalizeProfessionalForCitation(item))
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
        console.error('Error cargando catÃ¡logos de demanda', error);
        this.demandCatalogsError =
          'No fue posible cargar los catÃ¡logos de demanda desde el backend.';

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

    this.filteredConvPrev = this.convPrev.filter((item: any) => {
      const relatedId =
        item?.intPrev?.id ?? item?.int_prev_id ?? item?.intPrevId ?? null;

      return Number(relatedId) === Number(intPrevId);
    });

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
        'El RUN ingresado no es vÃ¡lido. Revise el nÃºmero y el dÃ­gito verificador.';
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
     * 2. El navegador calcula la posiciÃ³n real del card.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const section = this.personEditSection?.nativeElement;

        if (!section) {
          console.warn(
            '[DemandNew] No se encontrÃ³ el card de ediciÃ³n de persona.',
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
      this.searchError = 'Debe ingresar un RUN antes de realizar la bÃºsqueda.';
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
    this.stageVisualState = 'Pendiente de creaciÃ³n';

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

    console.log('[DemandNew] RUN bÃºsqueda longitudinal:', rut);

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
         * Si el longitudinal estÃ¡ bloqueado o no existe,
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
              () => new Error('La persona recuperada no posee un ID vÃ¡lido.'),
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
              ? 'Se recuperaron los datos de la persona, pero actualmente no tiene autorizaciÃ³n para consultar su ficha longitudinal.'
              : 'La persona estÃ¡ registrada, pero no posee una ficha longitudinal disponible.';
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

            // Solo cuando no existe se abre automÃ¡ticamente.
            this.showCreatePersonForm = true;
            this.showCreateEpisodeForm = false;
            this.showDemandantDetails = false;

            this.personForm.reset();
            this.personForm.patchValue({ rut });

            this.stageVisualState = 'Persona no registrada';

            this.searchError =
              'No se encontrÃ³ una persona registrada con ese RUN. Complete los datos para crearla.';

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
        toStringOrNull(raw.originalRequestDate) ??
        getTodayForDateInput(),

      responsibleUserId,

      contactTypeId: Number(raw.contactType),

      senderId: raw.sender ? Number(raw.sender) : null,

      diverterId: raw.diverter ? Number(raw.diverter) : null,

      initialObservation: toStringOrNull(raw.initialObservation),
    };

    this.isSavingEpisode = true;
    this.episodeSaveError = null;

    console.log('[DemandNew] Payload creaciÃ³n episodio:', payload);

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
              'EN TRÃMITE',

            currentResult:
              episode?.result?.name ??
              episode?.resultName ??
              episode?.resultCode ??
              'AÃšN SIN RESULTADO',

            initialObservation:
              episode?.initialObservation ?? raw.initialObservation ?? '',
          });

          this.episodeForm.markAsPristine();
          this.episodeForm.markAsUntouched();

          /*
           * No cargar todavÃ­a el longitudinal.
           * El endpoint continÃºa respondiendo 403.
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
              'El backend rechazÃ³ la creaciÃ³n del episodio por permisos.';
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
              'Los datos enviados para crear el episodio no son vÃ¡lidos.';
            return;
          }

          if (
            error.status === 0 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504
          ) {
            this.episodeSaveError =
              'El servicio de GestiÃ³n de Demanda no se encuentra disponible.';
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
      originalRequestDate:
        currentOriginalRequestDate || getTodayForDateInput(),

      initialProgramId: activeProgramId,

      initialProgramName: this.activeProgramName ?? '',

      currentProgramName: this.activeProgramName ?? '',

      currentState: 'EN TRÃMITE',
      currentResult: 'AÃšN SIN RESULTADO',

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

  private calculatePreviousTreatmentNumber(data: any): number {
    const previousEpisodes = data?.previousEpisodes ?? data?.episodes ?? [];

    return previousEpisodes.filter((episode: any) => {
      const hasEntryDate = Boolean(
        episode.entryToTreatmentAt ?? episode.entry_to_treatment_at,
      );

      const hasEntryEvent = (episode.events ?? []).some(
        (event: any) =>
          event.eventType?.code === 'INGRESO_TRATAMIENTO' ||
          event.eventTypeCode === 'INGRESO_TRATAMIENTO',
      );

      return hasEntryDate || hasEntryEvent;
    }).length;
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
     * La instituciÃ³n previsional se encuentra
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
         * DespuÃ©s de guardar consultamos el postulante completo.
         */
        switchMap((savedPerson: Postulant) => {
          const savedPersonId = Number(savedPerson?.id ?? existingPersonId);

          if (!Number.isFinite(savedPersonId) || savedPersonId <= 0) {
            return throwError(
              () =>
                new Error(
                  'El backend no devolviÃ³ un identificador vÃ¡lido del postulante.',
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
            '[DemandNew] Persona completa despuÃ©s de guardar:',
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
           * Carga el formulario usando Ãºnicamente
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
              error?.error?.message ?? 'Los datos enviados no son vÃ¡lidos.';
            return;
          }

          if (
            error?.status === 0 ||
            error?.status === 502 ||
            error?.status === 503 ||
            error?.status === 504
          ) {
            this.personSaveError =
              'El servicio no respondiÃ³ correctamente. Intente nuevamente en unos minutos.';
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
      toStringOrNull(raw.eventHour),
      toStringOrNull(raw.eventPeriod) ?? 'AM',
    );

    const payload = {
      eventTypeCode: 'ENTREVISTA',
      eventDate:
        toStringOrNull(raw.eventDate) ??
        new Date().toISOString().slice(0, 10),
      eventTime,
      programId: Number(programId),
      comment: toStringOrNull(raw.comment),
      observation: toStringOrNull(raw.observation),
      nextAction: toStringOrNull(raw.nextAction),
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

      // TodavÃ­a no estÃ¡n disponibles directamente en Postulant.
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
    if (!this.ensureCanManageCurrentEpisode()) {
      return;
    }
    this.observationForm.markAllAsTouched();

    if (this.observationForm.invalid || this.isSavingObservation) return;

    const episodeId = this.getCurrentEpisodeId();

    if (!episodeId) {
      this.observationError =
        'No fue posible identificar el episodio para registrar la observaciÃ³n.';
      return;
    }

    const programId = this.tokenService.getActiveProgramId();

    if (!programId) {
      this.observationError =
        'No fue posible identificar el programa activo para registrar la observaciÃ³n.';
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
          console.log('[DemandNew] ObservaciÃ³n registrada:', event);

          this.observationSuccess = 'ObservaciÃ³n registrada correctamente.';

          this.observationForm.reset({
            comment: '',
            observation: '',
          });

          this.loadEpisodeLongitudinal(episodeId);
        },
        error: (error) => {
          console.error('[DemandNew] Error registrando observaciÃ³n:', error);

          if (error?.status === 403) {
            this.observationError =
              'No tiene permisos para registrar observaciones en el episodio.';
            return;
          }

          this.observationError =
            'No fue posible registrar la observaciÃ³n. Revise los datos e intente nuevamente.';
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
     * La persona resumida serÃ¡ reemplazada despuÃ©s por el GET completo.
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
      } Â· ${currentStage?.daysInStage ?? 0} dÃ­as`;
    } else {
      this.stageLoaded = false;
      this.stageVisualState = 'Sin etapa activa cargada';
    }

    /*
     * =====================================================
     * PERSONA
     * =====================================================
     *
     * El longitudinal entrega una versiÃ³n resumida del
     * postulante. Por eso usamos su ID para consultar:
     *
     * GET /api/v1/postulants/{id}
     *
     * Esa consulta devuelve:
     * - lastName
     * - commune
     * - sex
     * - user completo o parcial
     * - demÃ¡s datos propios del postulante
     */
    const postulantId = Number(summarizedPostulant?.id);

    if (!Number.isFinite(postulantId) || postulantId <= 0) {
      console.warn(
        '[DemandNew] El longitudinal no contiene un postulante vÃ¡lido:',
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
         * Actualiza tambiÃ©n el resumen del episodio.
         */
        if (this.episodeSummary) {
          this.episodeSummary = {
            ...this.episodeSummary,
            postulant: completePerson,
          };
        }

        /*
         * Usa el mÃ©todo Ãºnico de carga del formulario.
         * AllÃ­ secondName se obtiene desde person.lastName.
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
           * DiagnÃ³stico de los eventos recibidos.
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
           * No se ejecuta mientras el usuario estÃ¡ editando,
           * para evitar sobrescribir cambios todavÃ­a no guardados.
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
              'No se encontrÃ³ el historial longitudinal del episodio.';
            return;
          }

          if (
            error?.status === 0 ||
            error?.status === 502 ||
            error?.status === 503 ||
            error?.status === 504
          ) {
            this.longitudinalError =
              'El servicio de GestiÃ³n de Demanda no respondiÃ³ correctamente.';
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
      return 'CitaciÃ³n de hoy';
    }

    if (this.isFutureCitation(item)) {
      return 'PrÃ³xima citaciÃ³n';
    }

    return 'Sin fecha';
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

    const episodeId = this.getCurrentEpisodeId();

    if (!episodeId) {
      this.citationError =
        'No fue posible identificar el episodio para registrar la citaciÃ³n.';
      return;
    }

    const programId = this.tokenService.getActiveProgramId();

    if (!programId) {
      this.citationError =
        'No fue posible identificar el programa activo para registrar la citaciÃ³n.';
      return;
    }

    const raw = this.citationForm.getRawValue();

    const eventDate = formatDateForBackend(raw.eventDate);
    const eventTime = this.buildEventTime(raw.eventHour, raw.eventPeriod);

    if (!eventDate) {
      this.citationError =
        'Debe seleccionar una fecha vÃ¡lida para la citaciÃ³n.';
      return;
    }

    if (!eventTime) {
      this.citationError =
        'Debe ingresar una hora vÃ¡lida y seleccionar AM o PM.';
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
      professionName: toStringOrNull(raw.professionName),
      comment: toStringOrNull(raw.comment),
      citationComment: toStringOrNull(raw.citationComment),
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
          console.log('[DemandNew] CitaciÃ³n registrada:', event);

          this.citationSuccess = 'CitaciÃ³n registrada correctamente.';

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
          console.error('[DemandNew] Error registrando citaciÃ³n:', error);

          if (error.status === 403) {
            this.citationError =
              'No tiene permisos para registrar citaciones en el episodio.';
            return;
          }

          if (error.status === 400) {
            this.citationError =
              error.error?.message ||
              'Los datos de la citaciÃ³n no son vÃ¡lidos.';
            return;
          }

          this.citationError =
            'No fue posible registrar la citaciÃ³n. Revise los datos e intente nuevamente.';
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
        'Debe seleccionar una citaciÃ³n vÃ¡lida para registrar asistencia.';
      return;
    }

    const payload = {
      eventTypeCode: 'ASISTENCIA',

      eventDate:
        toStringOrNull(selectedCitation?.eventDate) ??
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

      professionName: toStringOrNull(selectedCitation?.professionName),

      comment: toStringOrNull(raw.comment),
    };

    console.log('[DemandNew] Payload asistencia:', payload);
    console.log('[DemandNew] CitaciÃ³n seleccionada:', selectedCitation);
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
           * No usamos closeActionPanel() porque todavÃ­a
           * isSavingAttendance puede continuar en true
           * hasta que se ejecute finalize().
           */
          this.activeActionPanel = null;

          /*
           * Recarga completa para actualizar:
           * - estado de asistencia de la citaciÃ³n;
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
      return 'AtenciÃ³n prioritaria';
    }

    if (color === 'AMARILLO') {
      return 'Seguimiento preventivo';
    }

    if (color === 'VERDE') {
      return 'Dentro de plazo';
    }

    return 'Sin clasificaciÃ³n';
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
    return this.episodeEvents.filter(
      (event: any) => event?.eventType?.code === 'OBSERVACION',
    );
  }

  get canManageCurrentEpisode(): boolean {
    const sessionProgramId = Number(
      this.activeProgramId ?? this.tokenService.getActiveProgramId(),
    );

    const episodeProgramId = Number(
      this.episodeSummary?.currentProgram?.id ??
        this.episodeSummary?.currentProgramId ??
        this.longitudinal?.activeEpisode?.currentProgram?.id ??
        this.longitudinal?.activeEpisode?.currentProgramId ??
        0,
    );

    return (
      sessionProgramId > 0 &&
      episodeProgramId > 0 &&
      sessionProgramId === episodeProgramId
    );
  }

  get episodeProgramRestrictionMessage(): string {
    if (this.canManageCurrentEpisode) {
      return '';
    }

    const episodeProgramName =
      this.episodeSummary?.currentProgram?.name ??
      this.longitudinal?.activeEpisode?.currentProgram?.name ??
      'otro programa';

    return (
      `Modo consulta: este episodio estÃ¡ actualmente bajo la responsabilidad de ` +
      `${episodeProgramName}. El programa activo de la sesiÃ³n no puede registrar ` +
      `ni modificar gestiones.`
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

