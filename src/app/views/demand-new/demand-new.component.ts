import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';

import { finalize } from 'rxjs/operators';
import { PostulantService } from '@app/services/postulant.service';
import { Postulant } from '@app/models/postulant';
import { PreloadCatalogsService } from '@app/services/demand/preload-catalogs.service';
import { TokenService } from '@app/services/token.service';

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

import {
  DemandCatalogItem,
  DemandCatalogsDTO,
  DemandService,
} from '../../core/services/demand.service';

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
  ],
})
export class DemandNewComponent implements OnInit {
  private fb = inject(FormBuilder);
  private postulantService = inject(PostulantService);
  private preloadCatalogs = inject(PreloadCatalogsService);
  private readonly tokenService = inject(TokenService);
  private readonly demandService = inject(DemandService);
  private readonly demandEpisodeService = inject(DemandEpisodeService);

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

  sexes: any[] = [];
  communes: any[] = [];
  intPrev: any[] = [];
  convPrev: any[] = [];
  filteredConvPrev: any[] = [];

  substances: any[] = [];
  secondarySubstanceMap: { [id: number]: number } = {};

  contactTypes: any[] = [];
  senders: any[] = [];
  diverters: any[] = [];

  searchForm = this.fb.group({
    rut: ['', Validators.required],
  });

  activeProgramName: string | null = null;
  activeProgramId: number | null = null;
  stageVisualState = 'Pendiente de creación';

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
    initialObservation: [{ value: '', disabled: true }],

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
      enabled: false,
    },
    {
      icon: 'how_to_reg',
      title: 'Registrar asistencia',
      description:
        'Marcar si se presentó, no se presentó, reprogramó o quedó pendiente.',
      enabled: false,
    },
    {
      icon: 'assignment',
      title: 'Entrevista / evaluación',
      description: 'Registrar evento clínico o social independiente.',
      enabled: false,
    },
    {
      icon: 'notes',
      title: 'Observación',
      description: 'Agregar observación general del episodio o etapa.',
      enabled: false,
    },
    {
      icon: 'sync_alt',
      title: 'Referir programa',
      description:
        'Cerrar etapa origen y crear etapa receptora sin reiniciar días.',
      enabled: false,
    },
    {
      icon: 'fact_check',
      title: 'Ingreso a tratamiento',
      description: 'Registrar ingreso efectivo y detener KPI de espera.',
      enabled: false,
    },
    {
      icon: 'logout',
      title: 'Egreso / cierre',
      description: 'Cerrar episodio con motivo, observación y auditoría.',
      enabled: false,
    },
  ];

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadActiveProgramContext();
    this.loadDemandCatalogs();

    this.personForm.get('intPrev')?.valueChanges.subscribe((id) => {
      this.filterConvPrevByIntPrev(Number(id));
    });
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
    this.searchForm.markAllAsTouched();

    if (this.searchForm.invalid || this.isSearching) return;

    const rawRut = this.searchForm.getRawValue().rut?.trim();
    const rut = this.formatRut(rawRut);

    if (!rut) return;

    this.isSearching = true;
    this.searched = true;
    this.personNotFound = false;
    this.selectedPerson = null;
    this.searchError = null;
    this.personSaveError = null;
    this.showCreatePersonForm = false;
    this.showCreateEpisodeForm = false;

    this.personLoaded = false;
    this.episodeLoaded = false;
    this.stageLoaded = false;
    this.filteredConvPrev = [];

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

    console.log('[DemandNew] RUN búsqueda:', rut);

    this.postulantService
      .getPersonByRut(rut)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (person) => {
          if (!person) {
            this.personNotFound = true;
            return;
          }

          this.selectedPerson = person;
          this.personLoaded = true;

          this.loadPrioritizedEpisodesFallback(rut);
        },
        error: (error) => {
          console.error(
            '[DemandNew] Error consultando persona por RUN:',
            error,
          );

          if (error?.status === 403) {
            this.searchError =
              'No tiene permisos para consultar personas por RUN. Solicite habilitar el endpoint /postulants/searchByRut.';
            return;
          }

          this.searchError =
            'No fue posible consultar la persona. Intente nuevamente o contacte a soporte.';
        },
      });
  }

  private loadPrioritizedEpisodesFallback(rut: string): void {
    this.demandEpisodeService
      .getPrioritizedEpisodes({
        page: 0,
        size: 20,
      })
      .subscribe({
        next: (response) => {
          console.log('[DemandNew] Episodios priorizados:', response);

          const episodes = response?.content ?? [];

          const matchedEpisode =
            episodes.find((episode: any) => {
              const episodeRut =
                episode?.rut ??
                episode?.postulantRut ??
                episode?.personRut ??
                episode?.postulant?.rut ??
                episode?.person?.rut ??
                null;

              return this.cleanRut(episodeRut) === this.cleanRut(rut);
            }) ?? null;

          if (!matchedEpisode) {
            this.episodeLoaded = false;
            console.log(
              '[DemandNew] No se encontró episodio para RUN en listado priorizado:',
              rut,
            );
            return;
          }

          console.log(
            '[DemandNew] Episodio encontrado por listado priorizado:',
            matchedEpisode,
          );

          this.createdEpisode = matchedEpisode;
          this.episodeLoaded = true;
          this.showCreateEpisodeForm = false;

          this.stageVisualState =
            matchedEpisode?.currentStageId || matchedEpisode?.stageId
              ? `Etapa inicial creada: ${
                  matchedEpisode?.currentStageId ?? matchedEpisode?.stageId
                }`
              : 'Episodio activo encontrado';
        },
        error: (error) => {
          console.error(
            '[DemandNew] Error consultando episodios priorizados:',
            error,
          );

          this.episodeLoaded = false;
        },
      });
  }

  private cleanRut(value: string | null | undefined): string {
    return String(value ?? '')
      .replace(/\./g, '')
      .replace(/-/g, '')
      .trim()
      .toUpperCase();
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
}
