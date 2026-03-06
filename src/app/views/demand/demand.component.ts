/********************************************************************
 * 🟦 DEMAND COMPONENT — VERSION REFACTORIZADA
 * Usa los 7 servicios: preload, rutSearch, save, previousRecords,
 * edit, utils y token.
 ********************************************************************/

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

// Material modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';
import { DangerConfirmData } from '@app/shared/confirm-dialog/DangerConfirmDialogComponent';

import { MatMenuModule } from '@angular/material/menu';

// Servicios
import { PreloadCatalogsService } from '@app/services/demand/preload-catalogs.service';
import { DemandUtilsService } from '@app/services/demand/demand-utils.service';

import { TokenService } from '@app/services/token.service';
import { PostulantService } from '@app/services/postulant.service';
import { ContactService } from '@app/services/contact.service';
import { RegisterService } from '@app/services/register.service';
import { RegisterMovementService } from '@app/services/register-movement.service';
import { RegisterSubstanceService } from '@app/services/register-substance.service';
import { RegisterSubstanceServiceDto } from '@app/services/substance-Create-Dto.service';
import { DemandCloneService } from '@app/services/demand/demand-clone.service';
import { Register } from '@app/models/register';

import { PostulantCreateService } from '@app/services/postulant-create.service';

import type { PostulantCreateDto } from '@app/models/postulant-create.dto';

import { DemandUpdateService } from '@app/services/demand/demand-update.service';
import { PostulantEditDialogComponent } from '@app/views/postulant/postulant-edit-dialog/postulant-edit-dialog.component';
import { ContactEditDialogComponent } from '@app/views/contact/contact-edit-dialog/contact-edit-dialog.component';

import { rutValidator } from '@app/core/validator/rut.validator';
import { CitationReportService } from '@app/services/reports/citation-report.service';

import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { distinctUntilChanged } from 'rxjs/operators';
import { PendingChangesComponent } from '@app/core/guards/pending-changes.interface';
import { HostListener } from '@angular/core';
import { switchMap } from 'rxjs/operators';

import { CitacionModalComponent } from './modals/citacion-modal/citacion-modal.component';
import { ConfirmDialogYesNoComponent } from '@app/shared/confirm-dialog/confirm-dialog-yes-no.component';
import { ObservacionModalComponent } from '../../views/modals/observaciones-modal/observacion-modal.component';

import { LoaderService } from '../../services/loader.service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

@Component({
  selector: 'app-demand',
  standalone: true,
  templateUrl: './demand.component.html',
  styleUrls: ['./demand.component.scss'],
  imports: [
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatIconModule,
    MatCheckboxModule,
    MatDividerModule,
    MatListModule,
    MatRadioModule,
    MatDialogModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
  ],
})
export class DemandComponent implements OnInit, PendingChangesComponent {
  private loader = inject(LoaderService);

  canClearForm = false; // 🧹 botón limpiar
  canEditPostulant = false; // ✏️ botón editar

  currentAction: 'NEW' | 'EDIT' | 'CLONE_SAME_PROGRAM' | 'CLONE_OTHER_PROGRAM' =
    'NEW';

  register: Register | null = null;
  fichaAnterior: any | null = null;
  private panelCerradoManualmente = false;
  uiReady = false;

  actionLabel: string = 'Gestión de Demanda';

  mostrarBloqueoPostulante = false;
  mostrarBloqueoReferente = false;

  estadoFormulario: number | null = null;

  // =========================
  // 🔐 FLAGS DE EDICIÓN
  // =========================

  saving = false;
  numerosTratamiento: number[] = Array.from({ length: 11 }, (_, i) => i);

  // =========================
  // 🧩 FORMULARIO
  // =========================

  form!: FormGroup;

  // =========================
  // UI / ESTADO
  // =========================

  citacionCollapsed = true;
  showBlock2 = false;
  showBlock3 = false;
  showBlock4 = false;

  private cargandoPrevision = false;
  private ultimoRutBuscado: string | null = null;

  isLoading = false;
  isSearchingRut = false;

  // =========================
  // CATÁLOGOS
  // =========================

  communes: any[] = [];
  sexes: any[] = [];
  contactTypes: any[] = [];
  senders: any[] = [];
  diverters: any[] = [];
  programs: any[] = [];
  notRelevants: any[] = [];
  substances: any[] = [];
  professions: any[] = [];
  results: any[] = [];
  states: any[] = [];
  convPrev: any[] = [];
  intPrev: any[] = [];
  filteredConvPrev: any[] = [];

  fichasMismoPrograma: any[] = [];
  fichasOtrosProgramas: any[] = [];
  mostrarPanelFichas = false;

  // =========================
  // SESIÓN
  // =========================

  fullName = '';
  activeProgram: string | null = null;

  observacionesDraft: string[] = []; // múltiples observaciones UI
  observacionEnEdicion: string | null = null;

  edad: number | null = null;
  diasTranscurridos: number | null = null;

  private dialog = inject(MatDialog);

  constructor(
    private fb: FormBuilder,
    private cdRef: ChangeDetectorRef,
    private preload: PreloadCatalogsService,
    public utils: DemandUtilsService,
    private tokenService: TokenService,
    private report: CitationReportService,
    private demandCloneService: DemandCloneService,
    private postulantService: PostulantService,
    private postulantCreateService: PostulantCreateService,
    private contactService: ContactService,
    private registerService: RegisterService,
    private registerMovementService: RegisterMovementService,
    private demandUpdateService: DemandUpdateService,
    private registerSubstanceService: RegisterSubstanceService,
    private registerSubstanceServiceDto: RegisterSubstanceServiceDto,
  ) {}

  movements: any[] = [];
  isLoadingMovements = false;

  displayedColumns = [
    'date',
    'hour',
    'profession',
    'professional',
    'state',
    'actions',
  ];
  // ============================================================
  // 🟦 INICIO
  // ============================================================

  ngOnInit(): void {
    this.initForm();
    this.loadSessionContext();

    // 🔹 Suscripciones reactivas (una sola vez)
    this.form
      .get('result')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe(() => {
        this.aplicarReglaIngresoTratamiento();
      });

    this.form.get('fechaSolicitud')?.valueChanges.subscribe((fecha) => {
      this.onFechaSolicitudChange(fecha);
    });

    this.form
      .get('birthDate')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((value) => {
        this.edad = this.utils.getEdadDesdeFecha(value);
      });

    // 🔹 Carga de catálogos
    this.loadCatalogs().then(() => {
      queueMicrotask(() => {
        this.nuevaDemanda(); // RESET REAL

        // Aplicar reglas una vez después de cargar todo
        this.aplicarReglaIngresoTratamiento();
        this.onFechaSolicitudChange(this.form.get('fechaSolicitud')?.value);
        this.edad = this.utils.getEdadDesdeFecha(
          this.form.get('birthDate')?.value,
        );

        this.uiReady = true;
        this.cdRef.detectChanges();
      });
    });

    this.setupReactiveListeners();
  }

  /* ==================================================
   🔒 CONTROL DE CAMBIOS SIN GUARDAR
================================================== */
  hasPendingChanges(): boolean {
    if (this.saving) return false;

    // Si el botón guardar está deshabilitado,
    // no hay cambios relevantes
    if (this.isSaveDisabled()) return false;

    return this.form?.dirty === true;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private setupReactiveListeners(): void {
    // 🔥 Resultado → aplicar regla clínica
    this.form
      .get('result')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((value) => {
        this.filterStateByResult(value);
      });

    this.form
      .get('notRelevants')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe(() => {
        this.aplicarReglaNoRelevante();
      });

    this.form
      .get('intPrev')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((rawId) => {
        if (this.cargandoPrevision) return;

        const id = Number(rawId);
        if (!id) return;

        this.filterConvPrevByIntPrev(id);
        this.aplicarReglaPrevision(id);
      });
  }

  private loadSessionContext(): void {
    // 👤 Usuario
    const profile = this.tokenService.getUserProfile();
    this.fullName = profile?.fullName?.trim() ?? '';

    // 🏥 Programa activo (ES STRING)
    this.activeProgram = this.tokenService.getActiveProgram();

    console.log('🧪 CONTEXTO SESIÓN');
    console.log('Usuario:', this.fullName);
    console.log('Programa:', this.activeProgram);
  }

  // ============================================================
  // 🟦 FORMULARIO
  // ============================================================
  initForm(): void {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    this.form = this.fb.group({
      rut: ['', [Validators.required, rutValidator()]],
      birthDate: new Date(),
      firstName: ['', Validators.required],
      secondName: [''],
      firstLastName: ['', Validators.required],
      secondLastName: [''],
      phone: [''],
      email: ['', [Validators.email, Validators.pattern(EMAIL_REGEX)]],

      commune: [null, Validators.required],
      address: [''],
      sex: [null, Validators.required],

      // Referente
      name: ['', Validators.required],
      cellphone: ['', Validators.required],
      emailPostulant: ['', [Validators.email, Validators.pattern(EMAIL_REGEX)]],
      contactDescription: [''],

      // Previsión
      intPrev: [null, Validators.required],
      convPrev: [{ value: null, disabled: true }, Validators.required],

      ntrat: [0, Validators.required],
      contactTypes: [null, Validators.required],

      // Sustancias
      substance: [null, Validators.required],
      secondarySubstances: [[]],

      senders: [null, Validators.required],
      diverters: [null, Validators.required],

      state: [null, Validators.required],
      result: [null, Validators.required],
      notRelevants: [null, Validators.required],

      fechaSolicitud: [null, Validators.required],

      // ===============================
      // 🟦 NUEVA ATENCIÓN (FORM AUXILIAR)
      // ===============================
      newDate: [now],
      newHour: [currentTime],
      newProfession: [null],
      newProfessional: [''],
      registerDescription: [''],
    });
  }

  // ============================================================
  // 📦 CARGAR CATÁLOGOS
  // ============================================================
  loadCatalogs(): Promise<void> {
    this.isLoading = true;

    return new Promise((resolve) => {
      this.preload.loadAll().subscribe({
        next: (data) => {
          this.communes = data.communes;
          this.sexes = data.sexes;
          this.contactTypes = [...data.contactTypes];
          this.senders = data.senders;
          this.diverters = data.diverters;
          this.programs = data.programs;
          this.notRelevants = data.notRelevants;
          this.substances = data.substances;

          this.intPrev = data.intPrev;
          this.convPrev = data.convPrev;
          this.filteredConvPrev = [];

          this.professions = data.profession1;
          this.results = data.results;
          this.states = data.state;

          // 🔑 BUSCAR VALORES POR DEFECTO
          const estadoEnTramite = this.states.find(
            (s) => s.name === 'EN TRAMITE',
          );

          const notRelevantNinguna = this.notRelevants.find(
            (n) => n.name === 'NINGUNA',
          );

          const resultadoSinResultado = this.results.find(
            (r) => r.name === 'AUN SIN RESULTADO',
          );

          this.isLoading = false;
          this.cdRef.detectChanges();
          resolve();
        },

        error: () => {
          this.isLoading = false;
          resolve();
        },
      });
    });
  }

  deletePendingCitacion(index: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogYesNoComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'dialog-ficha-clinica',
      disableClose: true,
      data: {
        title: 'Eliminar citación',
        message:
          'Esta citación aún no ha sido guardada y se perderá definitivamente.',
        icon: 'warning',
        color: 'warn',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.movements.splice(index, 1);
    });
  }

  editPendingCitacion(index: number, citacion: any): void {
    const dialogRef = this.dialog.open(CitacionModalComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'dialog-ficha-clinica',
      disableClose: true,
      data: {
        professions: this.professions,
        states: this.states,
        citacion, // 👈 perfecto
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      this.movements[index] = {
        ...result,
        isPersisted: false,
      };
    });
  }

  editarMovimiento(index: number, movement: any): void {
    if (this.saving) return;
    if (movement.id) return; // seguridad extra

    const dialogRef = this.dialog.open(CitacionModalComponent, {
      width: '300px',
      maxWidth: '95vw',
      panelClass: 'dialog-ficha-clinica',
      disableClose: true,
      data: {
        professions: this.professions,
        states: this.states,
        citacion: movement, // 🔥 IMPORTANTE
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (!updated) return;

      this.movements[index] = updated;
      this.movements = [...this.movements];

      this.form.markAsDirty();
      this.cdRef.detectChanges();
    });
  }

  eliminarMovimiento(index: number): void {
    const movement = this.movements[index];

    // Seguridad extra
    if (movement?.id) return;

    const dialogRef = this.dialog.open(ConfirmDialogYesNoComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'dialog-ficha-clinica',
      disableClose: true,
      data: {
        title: 'Eliminar citación',
        message:
          'Esta citación aún no ha sido guardada y se perderá definitivamente.',
        icon: 'warning',
        color: 'warn',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.movements.splice(index, 1);
      this.movements = [...this.movements];

      this.form.markAsDirty();
      this.cdRef.detectChanges();
    });
  }

  openNuevaCitacionModal(): void {
    const existeAgendada = this.movements.some((m) => {
      const estado = m?.state ?? '';
      return estado.trim().toUpperCase() === 'AGENDADO';
    });
    if (existeAgendada) {
      this.dialog.open(ConfirmDialogOkComponent, {
        width: '420px',
        disableClose: true,
        data: {
          title: 'Nueva Citación',
          message:
            'No se puede agendar una nueva citación mientras exista una citación con estado AGENDADO. Debe cambiar el estado de la anterior.',
          icon: 'warning',
          confirmText: 'Aceptar',
        },
      });

      return; // 🚫 corta ejecución
    }

    const dialogRef = this.dialog.open(CitacionModalComponent, {
      width: '300px',
      maxWidth: '95vw',
      panelClass: 'dialog-ficha-clinica',
      disableClose: true,
      data: {
        professions: this.professions,
      },
    });

    dialogRef.afterClosed().subscribe((movement) => {
      if (!movement) return;

      // 🔥 exactamente igual que addMovement()
      this.movements = [...this.movements, movement];
      this.form.markAsDirty();
      this.cdRef.detectChanges();
    });
  }

  openNuevoComentarioModal(): void {
    this.dialog
      .open(ObservacionModalComponent, {
        width: '520px',
        disableClose: true,
        data: {
          context: 'DEMAND',
          registerId: this.register?.id,
          observacion: this.observacionEnEdicion,
        },
      })
      .afterClosed()
      .subscribe((result: any) => {
        if (!result?.observacion) return;

        // 🔥 AQUÍ ESTÁ LA CLAVE
        const bloque = this.buildObservacionBloque(result.observacion);

        this.observacionesDraft.push(bloque);

        this.observacionEnEdicion = null;
        this.form.markAsDirty();
        this.cdRef.detectChanges();
      });
  }

  private ultimoContextoObservacion: {
    fecha: string;
    usuario: string;
    programa: string;
  } | null = null;

  private buildObservacionBloque(texto: string): string {
    const ahora = new Date();

    const fecha = ahora.toLocaleDateString('es-CL');
    const hora = ahora.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const usuario = this.fullName || 'Profesional';
    const programa = this.activeProgram || 'Programa';

    const mismoContexto =
      this.ultimoContextoObservacion &&
      this.ultimoContextoObservacion.fecha === fecha &&
      this.ultimoContextoObservacion.usuario === usuario &&
      this.ultimoContextoObservacion.programa === programa;

    // 🔁 MISMO usuario + programa + fecha → SOLO HORA
    if (mismoContexto) {
      return `Hora: ${hora}
        ${texto}`;
    }
    // 🆕 NUEVO CONTEXTO → encabezado completo
    this.ultimoContextoObservacion = {
      fecha,
      usuario,
      programa,
    };
    return `Fecha: ${fecha} Hora: ${hora}
      Usuario: ${usuario} Programa: ${programa}
      ${texto}`;
  }

  private buildFinalObservaciones(): string {
    return this.observacionesDraft.join('\n\n');
  }

  private getActiveProgramId(): number | null {
    const programList = JSON.parse(sessionStorage.getItem('programs') || '[]');
    const activeName = this.tokenService.getActiveProgram();
    const p = programList.find((x: any) => x.name === activeName);
    return p?.id ?? null;
  }

  // ============================================================
  // 🟦 Crear Register Movimiento de Atención
  // ============================================================
  addMovement(): void {
    const { newDate, newHour, newProfession, newProfessional } =
      this.form.value;

    if (!newDate || !newHour || !newProfession || !newProfessional) return;

    const newMovement = {
      id: null,
      profession: this.professions.find((p) => p.id === Number(newProfession)),
      full_name: String(newProfessional),
      date_attention: formatDate(newDate, 'yyyy-MM-dd', 'en-CL'),
      hour_attention: String(newHour),
      state: 'AGENDADO',
      __isNew: true,
      __isDirty: true,
    };

    // 🔥 CLAVE: nueva referencia (mat-table refresca)
    this.movements = [...this.movements, newMovement];
    this.cdRef.detectChanges();

    this.form.patchValue({
      newDate: null,
      newHour: '',
      newProfession: null,
      newProfessional: '',
    });
  }

  // ============================================================
  // 🟦 Cancela Register Movimiento de Atención
  // ============================================================
  setMovementState(movement: any, accion: string): void {
    const stateChanged = movement.state !== accion;

    movement.state = accion;

    if (!movement.id || stateChanged) {
      movement.__isDirty = true;
    }
    this.form.markAsDirty();
    this.cdRef.detectChanges();
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'AGENDADO':
        return 'state-agendado';

      case 'SE_PRESENTO':
        return 'state-presentado';

      case 'NO_SE_PRESENTO':
        return 'state-no-presentado';

      case 'CANCELA_PROGRAMA':
        return 'state-cancelado';

      default:
        return 'state-default';
    }
  }

  // ============================================================
  // 🟦 Crear y update Register Movimiento de Atención
  // ============================================================

  private async syncRegisterMovements(
    registerId: number,
    movements: any[],
  ): Promise<void> {
    for (const m of movements) {
      // ❌ datos incompletos
      if (
        !m.date_attention ||
        !m.hour_attention ||
        !m.profession?.id ||
        !m.full_name
      ) {
        continue;
      }

      // 🟢 NUEVO → CREATE
      if (!m.id) {
        const created: any = await firstValueFrom(
          this.registerMovementService.create({
            register: { id: registerId },
            profession: { id: m.profession.id },
            full_name: m.full_name,
            date_attention: m.date_attention,
            hour_attention: m.hour_attention,
            state: m.state ?? 'AGENDADO',
          }),
        );
        m.id = created.id;
        m.__isDirty = false;
        m.__isNew = false;
        continue;
      }

      // 🟡 EXISTENTE + CAMBIO → UPDATE (REEMPLAZO COMPLETO)
      if (m.__isDirty) {
        await firstValueFrom(
          this.registerMovementService.update(m.id, {
            register: { id: registerId },
            profession: { id: m.profession.id },
            full_name: m.full_name,
            date_attention: m.date_attention,
            hour_attention: m.hour_attention,
            state: m.state,
          }),
        );
      }
    }
  }

  private toggleBodyScroll(block: boolean): void {
    document.body.style.overflow = block ? 'hidden' : '';
  }

  // ===========================================================
  // 🔁 Builder Datos de Contactos
  // ===========================================================
  private buildContactPayload(): any {
    return {
      name: this.form.value.name?.trim() || null,
      description: this.form.value.contactDescription?.trim() || null,
      email: this.form.value.emailPostulant?.trim() || null,
      cellphone: this.form.value.cellphone?.trim() || null,
    };
  }

  // ===========================================================
  // 🔁 Builder Register
  // ===========================================================
  private buildRegisterPayload(userId: number): any {
    if (!this.register) {
      throw new Error('buildRegisterPayload llamado sin register cargado');
    }

    const raw = this.form.getRawValue();

    return {
      postulant: { id: this.register.postulant.id },
      program: { id: this.register.program.id },
      user: { id: userId },

      contactType: { id: this.extractId(raw.contactTypes) },
      sender: { id: this.extractId(raw.senders) },
      diverter: { id: this.extractId(raw.diverters) },

      number_tto: Number(raw.ntrat ?? 0),

      description: raw.registerDescription?.trim() || null,

      result: raw.result ? { id: this.extractId(raw.result) } : null,
      state: raw.state ? { id: this.extractId(raw.state) } : null,

      notRelevant: raw.notRelevants ? { id: Number(raw.notRelevants) } : null,

      date_attention: raw.fechaSolicitud ?? null,

      is_history: 'NO',
    };
  }
  // ===========================================================
  // 🔁 ACTUALIZAR DEMANDA (MISMA BASE QUE GUARDAR)
  // ===========================================================
  async updateDemand(): Promise<boolean> {
    if (!this.register) return false;

    const register = this.register;
    const registerId = register.id;

    if (!this.validateEditDemand()) {
      console.error('Formulario inválido (EDIT)');
      return false;
    }

    const userId = this.tokenService.getUserId();
    if (!userId) {
      this.showValidationDialog();
      return false;
    }

    this.saving = true;

    try {
      // 🟦 PASO 1
      await this.demandUpdateService.updateDemand(
        registerId,
        this.form.getRawValue(),
        {
          userId,
          programId: this.register.program.id,
        },
        this.register,
      );

      // 🟦 PASO 2

      if (this.observacionesDraft.length > 0) {
        const base = this.register?.description || '';
        const nuevas = this.observacionesDraft.join('\n\n');
        const final = base ? `${base}\n\n${nuevas}` : nuevas;

        this.form.get('registerDescription')?.setValue(final);
      }

      const registerPayload = this.buildRegisterPayload(userId);

      await this.demandUpdateService.updateRegister(
        registerId,
        registerPayload,
      );

      // 🔥 PASO 3
      await this.syncRegisterMovements(registerId, this.movements);

      // 🔥 PASO 3.5
      await this.updateSubstances(registerId);

      // 🔄 PASO 4
      this.register = await firstValueFrom(
        this.registerService.getById(registerId),
      );

      // 🟦 PASO 5
      this.utils.cargarFichaCompletaEnFormulario(this.form, this.register);

      this.observacionesDraft = [];
      this.observacionEnEdicion = null;
      this.ultimoRutBuscado = null;

      this.form.markAsPristine();
      this.form.markAsUntouched();

      this.cdRef.detectChanges();

      console.log('✅ Demanda actualizada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error al actualizar la demanda', error);
      return false;
    } finally {
      this.saving = false;
    }
  }

  //----------------------------------------------------------------------------------------------------

  async updateSubstances(registerId: number): Promise<void> {
    // 1️⃣ Anular sustancias actuales (soft delete)
    await firstValueFrom(
      this.registerSubstanceService.deleteByRegisterId(registerId),
    );

    // 2️⃣ Obtener valores desde el formulario
    const principal = this.extractId(this.form.value.substance);

    const secondaries: number[] = (this.form.value.secondarySubstances || [])
      .map((s: any) => this.extractId(s))
      .filter((s: number | null): s is number => s !== null && s !== principal);

    // 🟢 Principal
    if (principal) {
      await firstValueFrom(
        this.registerSubstanceServiceDto.create({
          register: { id: registerId },
          substance: { id: principal },
          level: 'Principal',
        }),
      );
    }

    // 🟡 Secundarias
    for (const s of secondaries) {
      await firstValueFrom(
        this.registerSubstanceServiceDto.create({
          register: { id: registerId },
          substance: { id: s },
          level: 'Secundaria',
        }),
      );
    }

    console.log('✅ Sustancias actualizadas (DTO)');
  }

  // ===========================================================
  // 💾 GUARDAR DEMANDA (sin tipo de previsión)
  // ===========================================================
  async saveDemand(): Promise<boolean> {
    // ===============================================
    // 🔎 VALIDACIÓN ÚNICA (NEW)
    // ===============================================
    if (!this.validateNewDemand()) {
      this.showValidationDialog();
      return false;
    }

    const userId = this.tokenService.getUserId();
    const programId = this.tokenService.getActiveProgramId();
    const raw = this.form.getRawValue();
    const fechaSolicitud = this.form.get('fechaSolicitud')?.value;

    // ===============================================
    // 🔹 SESIÓN USUARIO
    // ===============================================
    if (!userId) {
      this.showValidationDialog('Sesión inválida. Inicie sesión nuevamente.');
      return false;
    }

    // ===============================================
    // 🔹 PROGRAMA ACTIVO
    // ===============================================
    if (!programId) {
      this.showValidationDialog('No hay programa activo asociado al usuario.');
      return false;
    }

    try {
      // ===============================================================
      // 🟦 PASO 1: CREAR POSTULANTE
      // ===============================================================
      const postulantPayload: PostulantCreateDto = {
        user: { id: userId },

        commune: { id: raw.commune },
        sex: { id: raw.sex },

        convPrev: raw.convPrev
          ? {
              id: raw.convPrev,
              intPrev: { id: raw.intPrev },
            }
          : undefined,

        firstName: raw.firstName?.trim() ?? null,
        lastName: raw.secondName?.trim() ?? null,
        firstLastName: raw.firstLastName?.trim() ?? null,
        secondLastName: raw.secondLastName?.trim() ?? null,

        rut: raw.rut,
        birthdate: formatDate(raw.birthDate, 'yyyy-MM-dd', 'en-CL'),

        email: raw.email?.trim() ?? null,
        phone: raw.phone?.trim() ?? null,
        address: raw.address?.trim() ?? null,
      };

      const postulant = await firstValueFrom(
        this.postulantCreateService.create(postulantPayload),
      );

      // ===============================================================
      // 🟦 PASO 2: CONTACTO
      // ===============================================================
      const contact = await firstValueFrom(
        this.contactService.createDto({
          name: raw.name?.trim() || null,
          description: raw.contactDescription?.trim() || null,
          email: raw.emailPostulant?.trim() || null,
          cellphone: raw.cellphone?.trim() || null,
          postulant: { id: postulant.id! },
        }),
      );

      // ===============================================================
      // 🟦 PASO 3: REGISTER
      // ===============================================================
      const register = await firstValueFrom(
        this.registerService.create({
          postulant: { id: postulant.id },
          contact: { id: contact.id },

          contactType: { id: this.extractId(raw.contactTypes)! },
          sender: { id: this.extractId(raw.senders)! },
          diverter: { id: this.extractId(raw.diverters)! },

          program: { id: programId },
          user: { id: userId },

          number_tto: raw.ntrat === 0 ? 0 : raw.ntrat ? raw.ntrat : null,

          notRelevant: raw.notRelevants ? { id: raw.notRelevants } : null,
          result: raw.result ? { id: raw.result } : null,
          state: raw.state ? { id: raw.state } : null,

          date_attention: fechaSolicitud ?? null,
          description: raw.registerDescription?.trim() || null,
          is_history: 'NO',
        }),
      );

      // ===============================================================
      // 🟦 PASO 4: MOVIMIENTOS
      // ===============================================================
      await this.syncRegisterMovements(register.id, this.movements);

      // ===============================================================
      // 🟦 PASO 5: SUSTANCIAS
      // ===============================================================
      const principal = this.extractId(raw.substance);

      const secondaries: number[] = (raw.secondarySubstances || [])
        .map((s: any) => this.extractId(s))
        .filter(
          (s: number | null): s is number => s !== null && s !== principal,
        );

      if (principal) {
        await firstValueFrom(
          this.registerSubstanceServiceDto.create({
            register: { id: register.id },
            substance: { id: principal },
            level: 'Principal',
          }),
        );
      }

      for (const s of secondaries) {
        await firstValueFrom(
          this.registerSubstanceServiceDto.create({
            register: { id: register.id },
            substance: { id: s },
            level: 'Secundaria',
          }),
        );
      }

      // ===============================================================
      // 🔄 RECARGA
      // ===============================================================
      this.register = await firstValueFrom(
        this.registerService.getById(register.id),
      );

      this.utils.cargarFichaCompletaEnFormulario(this.form, this.register);

      // ===============================================================
      // 🔄 PASA A EDIT
      // ===============================================================
      this.currentAction = 'EDIT';
      this.actionLabel = '🔵 Modificando Demanda';

      this.bloquearCamposPostulante();
      this.bloquearCamposReferente();

      this.canClearForm = true;
      this.canEditPostulant = true;

      this.form.markAsPristine();
      this.form.markAsUntouched();

      this.cdRef.detectChanges();

      this.mostrarMensajeExito('Demanda creada correctamente');

      this.ultimoRutBuscado = null;

      this.form.patchValue({
        newDate: null,
        newHour: '',
        newProfession: null,
        newProfessional: '',
      });

      return true;
    } catch (error) {
      console.error('❌ Error guardar la demanda', error);
      return false;
    }
  }

  // ===========================================================
  // 💾 GUARDAR CLON DE DEMANDA (delegado a DemandCloneService)
  // ===========================================================
  async saveDemandClone(): Promise<boolean> {
    if (!this.validateCloneDemand()) {
      return false;
    }

    const fechaSolicitud = this.form.get('fechaSolicitud')?.value;

    if (!fechaSolicitud) {
      this.showValidationDialog(
        'Debe ingresar la fecha de solicitud antes de guardar la demanda.',
      );
      return false;
    }

    const userId = this.tokenService.getUserId();
    if (!userId || !this.fichaAnterior?.postulant) {
      this.showValidationDialog();
      return false;
    }

    const activeProgram =
      this.tokenService.getActiveProgram() ||
      this.tokenService.getUserPrograms()?.[0];

    const programList = JSON.parse(sessionStorage.getItem('programs') || '[]');
    const programObj = programList.find((p: any) => p.name === activeProgram);

    if (!programObj?.id) {
      this.showValidationDialog('Programa activo inválido.');
      return false;
    }

    try {
      const raw = this.form.getRawValue();

      raw.postulantId = this.fichaAnterior.postulant.id;
      raw.contactId = this.fichaAnterior.contact?.id;

      if (!raw.postulantId || !raw.contactId) {
        this.showValidationDialog(
          'No es posible clonar la demanda: faltan datos del postulante o contacto.',
        );
        return false;
      }

      raw.notRelevants ??= this.getNotRelevanteNinguna();
      raw.result ??= this.getResultadoSinResultado();
      raw.state ??= this.getEstadoEnTramite();

      const principal = this.extractId(raw.substance);
      if (!principal) {
        this.showValidationDialog(
          'Debe seleccionar una sustancia principal para clonar la demanda.',
        );
        return false;
      }

      if (this.observacionesDraft.length > 0) {
        raw.registerDescription = this.buildFinalObservaciones();
      }

      const createdRegister = await this.demandCloneService.cloneDemand({
        formRaw: raw,
        userId,
        programId: programObj.id,
        movements: this.movements,
      });

      this.register = await firstValueFrom(
        this.registerService.getById(createdRegister.id),
      );

      this.utils.cargarFichaCompletaEnFormulario(this.form, this.register);

      this.movements = [];
      this.fichaAnterior = null;

      this.form.patchValue({
        registerDescription: '',
        newDate: null,
        newHour: '',
        newProfession: null,
        newProfessional: '',
      });

      this.observacionesDraft = [];
      this.observacionEnEdicion = null;

      this.form.markAsPristine();
      this.form.markAsUntouched();

      return true;
    } catch (error) {
      console.error('❌ Error guardando demanda (CLONE)', error);
      return false;
    }
  }

  // ============================================================
  // 🟦 CARGAR DEMANDA COMPLETA (EDIT / USAR FICHA)
  // ============================================================
  private async loadDemandCompleta(registerId: number): Promise<void> {
    this.isLoading = true;
    this.cargandoPrevision = true; // 🔒 bloquear reacciones

    try {
      const [register, substances, movements] = await Promise.all([
        firstValueFrom(this.registerService.getById(registerId)),
        firstValueFrom(
          this.registerSubstanceService.searchByRegisterId(registerId),
        ),
        firstValueFrom(
          this.registerMovementService.searchByRegisterId(registerId),
        ),
      ]);

      this.register = register;

      // ============================
      // 🟦 DATOS BASE (REGISTER)
      // ============================
      this.utils.cargarFichaCompletaEnFormulario(this.form, register);

      this.setEstadoFormularioFromRegister(register);

      // 🔥 aplicar regla al abrir en edición
      this.filterStateByResult(this.form.get('result')?.value);

      // ============================
      // 🟦 POSTULANTE COMPLETO (CLAVE)
      // ============================
      const postulant = await firstValueFrom(
        this.postulantService.getById(register.postulant.id),
      );

      // ============================
      // 🟦 PREVISIÓN (DESDE POSTULANT)
      // ============================
      const intPrevId = postulant.convPrev?.intPrev?.id ?? null;
      const convPrevId = postulant.convPrev?.id ?? null;

      if (intPrevId) {
        // 1️⃣ setear tipo previsión SIN eventos
        this.form.get('intPrev')?.setValue(intPrevId, { emitEvent: false });

        // 2️⃣ filtrar previsiones
        this.filterConvPrevByIntPrev(intPrevId);

        // 3️⃣ habilitar convPrev
        const convPrevControl = this.form.get('convPrev');
        convPrevControl?.enable({ emitEvent: false });

        // 4️⃣ setear previsión real
        if (convPrevId) {
          convPrevControl?.setValue(convPrevId, { emitEvent: false });
        }

        // 5️⃣ aplicar reglas clínicas UNA vez
        this.aplicarReglaPrevision(intPrevId);
      }

      // ============================
      // 🟦 CONTACTO (FULL)
      // ============================
      if (register.contact?.id) {
        const contact = await firstValueFrom(
          this.contactService.getById(register.contact.id),
        );

        this.form.patchValue(
          {
            name: contact?.name ?? '',
            cellphone: contact?.cellphone ?? '',
            emailPostulant: contact?.email ?? '',
            contactDescription: contact?.description ?? '',
          },
          { emitEvent: false },
        );
      }

      // ============================
      // 🟦 MOVIMIENTOS
      // ============================
      this.movements = (movements ?? [])
        .filter((m: any) => Number(m.register?.id) === Number(register.id))
        .map((m: any) => ({
          ...m,
          __isDirty: false,
          __isNew: false,
        }));

      // ============================
      // 🟦 SUSTANCIAS
      // ============================
      const principal = substances.find((s: any) => s.level === 'Principal');
      const secundarias = substances.filter(
        (s: any) => s.level === 'Secundaria',
      );

      this.form.patchValue(
        {
          substance: principal?.substance?.id ?? null,
          secondarySubstances: secundarias.map((s: any) => s.substance.id),
        },
        { emitEvent: false },
      );

      // ============================
      // 🟦 UI FINAL
      // ============================
      this.form.markAsPristine();
      this.form.markAsUntouched();

      //this.cdRef.detectChanges();
    } catch (err) {
      console.error('❌ Error cargando demanda completa', err);
    } finally {
      this.cargandoPrevision = false;
      this.isLoading = false;
    }
  }

  // ============================================================
  // 🔍 FILTRADO DE PREVISIONES SEGÚN TIPO
  // ============================================================
  filterConvPrevByIntPrev(typeId: number): void {
    const convPrevControl = this.form.get('convPrev');

    if (!typeId || !this.convPrev.length) {
      this.filteredConvPrev = [];
      convPrevControl?.reset(null, { emitEvent: false });
      convPrevControl?.disable({ emitEvent: false });
      convPrevControl?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    // 1️⃣ Filtrar por asociación real
    this.filteredConvPrev = this.convPrev.filter(
      (p: any) => Number(p.intPrev?.id) === Number(typeId),
    );

    if (this.filteredConvPrev.length === 0) {
      convPrevControl?.reset(null, { emitEvent: false });
      convPrevControl?.disable({ emitEvent: false });
      convPrevControl?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    // 🔑 Habilitar correctamente
    convPrevControl?.enable({ emitEvent: false });
    convPrevControl?.updateValueAndValidity({ emitEvent: false });

    // 2️⃣ Si ya hay una previsión válida, NO pisarla
    const currentValue = convPrevControl?.value;
    const sigueSiendoValida = this.filteredConvPrev.some(
      (p) => p.id === currentValue,
    );

    if (sigueSiendoValida) {
      return; // 👈 CLAVE
    }

    // 3️⃣ Regla de negocio: FONASA → FONASA A
    let selected = null;

    if (Number(typeId) === 1) {
      selected =
        this.filteredConvPrev.find(
          (p) => this.normalize(p.name) === 'FONASA A',
        ) ?? this.filteredConvPrev[0];
    } else {
      selected = this.filteredConvPrev[0];
    }

    convPrevControl?.setValue(selected.id, { emitEvent: false });
    convPrevControl?.updateValueAndValidity({ emitEvent: false });

    this.cdRef.detectChanges();
  }

  // ============================================================
  // ESTADO SEGUN EL RESULTADO
  // ============================================================

  private filterStateByResult(resultId: number): void {
    const stateControl = this.form.get('state');

    const ingreso = this.getResultadoIngresoTratamiento();
    const aceptado = this.getEstadoAceptado();

    if (!resultId) {
      stateControl?.enable({ emitEvent: false });
      return;
    }

    if (resultId === ingreso && aceptado) {
      stateControl?.setValue(aceptado, { emitEvent: false });
      stateControl?.disable({ emitEvent: false });
    } else {
      stateControl?.enable({ emitEvent: false });
    }
  }

  // ============================================================
  // ESTADO SEGUN EL NO RELEVANTE
  // ============================================================

  private aplicarReglaNoRelevante(): void {
    if (!this.catalogsReady()) return;

    const actualNoRelevante = this.form.get('notRelevants')?.value;

    const ninguna = this.getNotRelevanteNinguna();
    const historico = this.getResultadoHistorico();
    const aunSinResultado = this.getResultadoSinResultado();

    const noAceptado = this.getEstadoNoAceptado();
    const enTramite = this.getEstadoEnTramite();

    if (
      !ninguna ||
      !historico ||
      !aunSinResultado ||
      !noAceptado ||
      !enTramite
    ) {
      return;
    }

    // 🔴 DISTINTO DE NINGUNA
    if (actualNoRelevante && actualNoRelevante !== ninguna) {
      this.form.patchValue(
        {
          result: historico,
          state: noAceptado,
        },
        { emitEvent: false },
      );
      return;
    }

    // 🟢 ES NINGUNA
    if (actualNoRelevante === ninguna) {
      this.form.patchValue(
        {
          result: aunSinResultado,
          state: enTramite,
        },
        { emitEvent: false },
      );
    }
  }

  // ============================================================
  // SUSTANCIAS
  // ============================================================
  selectPrincipal(id: number) {
    this.utils.selectPrincipal(this.form, id);
  }

  toggleSecondary(id: number) {
    this.utils.toggleSecondary(this.form, id);
  }

  validatePrincipal(): boolean {
    return this.utils.validatePrincipal(this.form);
  }

  // ===========================================================
  // 🧾 Métodos del formulario
  // ===========================================================
  onSubmit(): void {
    if (this.isSaveDisabled()) return;
    this.viewAction();
  }

  cancel(): void {
    this.nuevaDemanda();
  }

  get observacionesPreview(): string {
    const base = this.form.get('registerDescription')?.value || '';

    if (!this.observacionesDraft.length) {
      return base;
    }

    return base
      ? `${base}\n\n${this.observacionesDraft.join('\n\n')}`
      : this.observacionesDraft.join('\n\n');
  }

  // ===========================================================
  // 🧮 Métodos auxiliares
  // ===========================================================
  onChangeGroup(field: string): void {
    const controlName = `asistencia${field}`;
    const asistencia = this.form.get(controlName)?.value; // "Ninguna" | "Se presentó" | "No se presentó"
    setTimeout(() => {
      // ================================
      // SI ELIGE "Ninguna" → cerrar bloques siguientes
      // ================================
      if (asistencia === 'Ninguna') {
        if (field === '1') {
          this.showBlock2 = false;
          this.showBlock3 = false;
          this.showBlock4 = false;

          this.form
            .get('asistencia2')
            ?.setValue('Ninguna', { emitEvent: false });
          this.form
            .get('asistencia3')
            ?.setValue('Ninguna', { emitEvent: false });
          this.form
            .get('asistencia4')
            ?.setValue('Ninguna', { emitEvent: false });
        } else if (field === '2') {
          this.showBlock3 = false;
          this.showBlock4 = false;

          this.form
            .get('asistencia3')
            ?.setValue('Ninguna', { emitEvent: false });
          this.form
            .get('asistencia4')
            ?.setValue('Ninguna', { emitEvent: false });
        } else if (field === '3') {
          this.showBlock4 = false;

          this.form
            .get('asistencia4')
            ?.setValue('Ninguna', { emitEvent: false });
        }

        this.cdRef.detectChanges();
        return;
      }

      // ================================
      // SI ELIGE "Se presentó" o "No se presentó"
      // habilitar el siguiente bloque
      // ================================
      switch (field) {
        case '1':
          this.showBlock2 = true;
          break;

        case '2':
          this.showBlock3 = true;
          break;

        case '3':
          this.showBlock4 = true;
          break;

        case '4':
          //////console.log('📁 Registro pasa a histórico:', this.form.value);
          break;
      }

      this.cdRef.detectChanges();
    });
  }

  // ============================================================
  // 🔠 FORMATEAR Y VALIDAR RUT EN VIVO
  // ============================================================
  autoFormatRut(event: any): void {
    this.panelCerradoManualmente = false;
    let value = event.target.value.toUpperCase();

    // Solo números y K
    value = value.replace(/[^0-9K]/g, '');

    // Máx 9 caracteres
    if (value.length > 9) {
      value = value.slice(0, 9);
    }

    if (value.length < 2) {
      const control = this.form.get('rut');
      control?.setValue(value, { emitEvent: false });
      control?.updateValueAndValidity({ emitEvent: false }); // 🔑 CLAVE
      return;
    }

    const cuerpo = value.slice(0, -1);
    const dv = value.slice(-1);

    const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const rutFinal = `${cuerpoFmt}-${dv}`;

    this.form.get('rut')?.setValue(rutFinal, { emitEvent: false });
    this.form.get('rut')?.updateValueAndValidity({ emitEvent: false });
  }

  onRutFinalizado(): void {
    const control = this.form.get('rut');
    if (!control) return;

    control.updateValueAndValidity();
    control.markAsTouched();

    if (control.valid) {
      this.searchByRut();
    }
  }

  preventEnter(event: Event): void {
    const target = event.target as HTMLElement;

    if (target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
  }

  /* ************************************************************* */
  /* reporte */
  /* ************************************************************* */

  imprimirCitacion(index: number, movement: any): void {
    const numero = index + 1;
    const raw = this.form.getRawValue();

    const demandante = [
      raw.firstName,
      raw.secondName,
      raw.firstLastName,
      raw.secondLastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const rut = raw.rut ?? '-'; // 👈 aquí tomas el RUT

    // ✅ generar HTML (NO imprime)
    const html = this.report.generateFromMovement({
      numero,
      movement,
      demandante,
      usuario: this.fullName,
      professions: this.professions,
      program: this.activeProgram,
      rut,
    });

    // ✅ imprimir sin robar foco
    this.report.printHtml(html);
  }

  /* ************************************************************* */
  /* reporte */
  /* ************************************************************* */

  async viewAction(): Promise<void> {
    if (this.saving || !this.currentAction) return;

    this.loader.lock();
    this.saving = true;

    let success = false;
    let message = '';
    try {
      switch (this.currentAction) {
        case 'EDIT':
          success = await this.updateDemand();
          message = 'Demanda actualizada correctamente';
          break;
        case 'CLONE_SAME_PROGRAM':
          success = await this.saveDemandClone();
          message = 'Demanda clonada correctamente';
          break;

        case 'CLONE_OTHER_PROGRAM':
          success = await this.saveDemandClone();
          message = 'Demanda clonada correctamente';
          break;
        case 'NEW':
          success = await this.saveDemand();
          message = 'Demanda creada correctamente';
          break;
      }
    } catch (error) {
      this.loader.unlock();
      this.saving = false;
      this.mostrarMensajeError('Error al guardar la demanda');
      this.cdRef.detectChanges();
      return;
    }

    // 🔥 Liberar SIEMPRE antes del diálogo
    this.loader.unlock();
    this.saving = false;
    if (success) {
      this.mostrarMensajeExito(message);
    }
    this.cdRef.detectChanges();
  }

  private mostrarMensajeExito(mensaje: string): void {
    this.dialog.open(ConfirmDialogOkComponent, {
      width: '520px',
      disableClose: true,
      data: {
        title: 'Operación exitosa',
        message: mensaje,
        icon: 'check_circle',
        confirmText: 'Aceptar',
      },
    });
  }

  private mostrarMensajeError(mensaje: string): void {
    this.dialog.open(ConfirmDialogOkComponent, {
      width: '520px',
      disableClose: true,
      data: {
        title: 'Error',
        message: mensaje,
        icon: 'warning',
        confirmText: 'Aceptar',
      },
    });
  }

  validateNewDemand(): boolean {
    // 🔴 0️⃣ RUT obligatorio y válido
    const rutControl = this.form.get('rut');

    if (!rutControl || rutControl.invalid) {
      rutControl?.markAsTouched();
      this.showValidationDialog('Debe ingresar un RUT válido.');
      return false;
    }

    // 1️⃣ Sustancia principal
    if (!this.validatePrincipal()) {
      this.showValidationDialog(
        'Debe seleccionar una sustancia principal válida.',
      );
      return false;
    }

    // 2️⃣ Validación general Angular
    if (this.form.invalid) {
      this.marcarErrores();

      const campos = this.getInvalidFields().join(', ');
      this.showValidationDialog(`Faltan campos obligatorios: ${campos}`);

      return false;
    }

    return true;
  }

  validateCloneDemand(): boolean {
    if (!this.validatePrincipal()) return false;

    if (!this.fichaAnterior?.postulant) {
      this.showValidationDialog('No hay ficha base para clonar.');
      return false;
    }

    if (this.form.invalid) {
      this.marcarErrores();
      return false;
    }

    return true;
  }

  validateEditDemand(): boolean {
    const fechaSolicitud = this.form.get('fechaSolicitud')?.value;

    // 1️⃣ fecha Solicitud
    if (!fechaSolicitud) {
      this.showValidationDialog(
        'Debe ingresar la fecha de solicitud antes de guardar la demanda.',
      );
      return false;
    }
    // 1️⃣ Sustancia principal
    if (!this.validatePrincipal()) {
      this.showValidationDialog(
        'Debe seleccionar una sustancia principal válida.',
      );
      return false;
    }

    // 2️⃣ Registro cargado
    if (!this.register?.id) {
      this.showValidationDialog('La demanda no está cargada correctamente.');
      return false;
    }

    // 3️⃣ Validación Angular completa
    if (this.form.invalid) {
      this.marcarErrores();

      const campos = this.getInvalidFields().join(', ');
      this.showValidationDialog(`Faltan campos obligatorios: ${campos}`);

      return false;
    }

    return true;
  }

  private showValidationDialog(
    message: string = 'Revise el formulario, faltan datos obligatorios.',
  ): void {
    this.dialog.open(ConfirmDialogOkComponent, {
      width: '620px',
      disableClose: true,
      data: {
        title: 'Formulario incompleto',
        message,
        icon: 'assignment_late',
        confirmText: 'Aceptar',
      },
    });
  }

  // ============================================================
  // 🔧 UTILIDAD: normaliza valores ID (select / array / null)
  // ============================================================
  private extractId(val: any): number | null {
    if (val === null || val === undefined) return null;

    if (Array.isArray(val)) {
      const first = val[0];
      return typeof first === 'object' ? Number(first.id) : Number(first);
    }

    if (typeof val === 'object') {
      return Number(val.id);
    }

    return Number(val);
  }

  // ============================================================
  // No cumple por Sistema de Salud
  // ============================================================
  private getNoRelevantePorPrevision(): number | null {
    const item = this.notRelevants.find(
      (n: any) => this.normalize(n.name) === 'POR PREVISION DE SALUD',
    );
    return item?.id ?? null;
  }

  private getResultadoHistorico(): number | null {
    const item = this.results.find(
      (r: any) => this.normalize(r.name) === 'HISTORICO',
    );
    return item?.id ?? null;
  }

  private getEstadoNoAceptado(): number | null {
    const item = this.states.find(
      (s: any) => this.normalize(s.name) === 'NO ACEPTADO',
    );
    return item?.id ?? null;
  }

  private catalogsReady(): boolean {
    return (
      this.notRelevants.length > 0 &&
      this.results.length > 0 &&
      this.states.length > 0
    );
  }

  private aplicarReglaPrevision(intPrevId: number): void {
    // ⛔ Catálogos aún no cargados
    if (!this.catalogsReady()) return;

    // 🟢 SOLO si es NEW aplicamos regla automática
    if (this.currentAction === 'NEW') {
      // 🟢 FONASA
      if (intPrevId === 1) {
        const ninguna = this.getNotRelevanteNinguna();
        const sinResultado = this.getResultadoSinResultado();
        const enTramite = this.getEstadoEnTramite();

        this.form.get('notRelevants')?.enable({ emitEvent: false });
        this.form.get('result')?.enable({ emitEvent: false });
        this.form.get('state')?.enable({ emitEvent: false });

        this.form.patchValue(
          {
            notRelevants: ninguna,
            result: sinResultado,
            state: enTramite,
          },
          { emitEvent: false },
        );

        return;
      }

      // 🔴 NO FONASA (NEW) → fuerza valores
      const noRelevante = this.getNoRelevantePorPrevision();
      const historico = this.getResultadoHistorico();
      const noAceptado = this.getEstadoNoAceptado();

      if (!noRelevante || !historico || !noAceptado) return;

      this.form.patchValue(
        {
          notRelevants: noRelevante,
          result: historico,
          state: noAceptado,
        },
        { emitEvent: false },
      );

      this.form.get('notRelevants')?.disable({ emitEvent: false });
      this.form.get('result')?.disable({ emitEvent: false });
      this.form.get('state')?.disable({ emitEvent: false });

      this.dialog.open(ConfirmDialogOkComponent, {
        disableClose: true,
        data: {
          title: 'Importante – Previsión de Salud debe ser FONASA',
          message: `
          El postulante <strong>no cumple con el requisito de previsión de salud</strong>
          para optar al tratamiento.<br><br>

          El registro quedará marcado como:<br>
          • <strong>No relevante: Por previsión de salud</strong><br>
          • <strong>Resultado: Histórico</strong><br>
          • <strong>Estado: No aceptado</strong><br><br>

          <strong>El registro puede continuar.</strong><br>
          La responsabilidad del ingreso recae en el profesional entrevistador.
        `,
          icon: 'warning',
          color: 'warn',
          confirmText: 'Entendido',
        },
      });
    } else {
      // 🔔 CASO MODIFY → solo avisar si NO es FONASA
      if (intPrevId !== 1) {
        const actualNoRelevante = this.form.get('notRelevants')?.value;
        const actualResultado = this.form.get('result')?.value;
        const actualEstado = this.form.get('state')?.value;

        const noRelevante = this.getNoRelevantePorPrevision();
        const historico = this.getResultadoHistorico();
        const noAceptado = this.getEstadoNoAceptado();

        if (!noRelevante || !historico || !noAceptado) return;

        const yaEstaCorrecto =
          actualNoRelevante === noRelevante &&
          actualResultado === historico &&
          actualEstado === noAceptado;

        // 🟢 Si ya está correcto → no hacer nada
        if (yaEstaCorrecto) return;

        // 🔔 Si NO está correcto → mostrar advertencia
        this.dialog.open(ConfirmDialogOkComponent, {
          disableClose: true,
          data: {
            title: 'Previsión de Salud debe ser FONASA',
            message: `
          <strong>Importante</strong><br><br>
          El postulante <strong>no cumple con el requisito de previsión de salud</strong>
          para optar al tratamiento.<br><br>

          La demanda debiera estar de la siguiente forma:<br><br>
          • NO RELEVANTE / NO CORRESPONDE = POR PREVISIÓN DE SALUD<br>
          • RESULTADO = HISTÓRICO<br>
          • ESTADO = NO ACEPTADO<br><br>

          La responsabilidad del ingreso recae en el profesional entrevistador.
        `,
            icon: 'warning',
            color: 'warn',
            confirmText: 'Entendido',
          },
        });
      }
    }
  }

  private normalize(text?: string): string {
    return (
      text
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // elimina tildes
        .toUpperCase()
        .trim() ?? ''
    );
  }

  editarPostulante(): void {
    // 🔑 Resolver contexto manualmente
    const postulantId =
      this.register?.postulant?.id ?? this.fichaAnterior?.postulant?.id;

    if (!postulantId) {
      console.warn('⚠️ No hay postulante disponible para editar');
      return;
    }

    this.dialog
      .open(PostulantEditDialogComponent, {
        width: '950px',
        disableClose: true,
        data: { postulantId },
      })
      .afterClosed()
      .subscribe((updated: boolean) => {
        if (!updated) return;

        // 🔵 EDITAR DEMANDA EXISTENTE
        if (this.register?.id) {
          this.loadDemandCompleta(this.register.id);
          return;
        }

        // 🟠 USAR DATOS / CLONE
        this.reloadPostulant();
      });
  }

  editarReferente(): void {
    // 🔑 Resolver contexto manualmente
    const contactId =
      this.register?.contact?.id ?? this.fichaAnterior?.contact?.id;

    if (!contactId) {
      console.warn('⚠️ No hay referente disponible para editar');
      return;
    }

    this.dialog
      .open(ContactEditDialogComponent, {
        width: '600px',
        disableClose: true,
        data: { contactId },
      })
      .afterClosed()
      .subscribe((updated: boolean) => {
        if (!updated) return;

        this.reloadReferente();
      });
  }

  private reloadPostulant(): void {
    const postulantId =
      this.register?.postulant?.id ?? this.fichaAnterior?.postulant?.id;

    if (!postulantId) return;

    this.postulantService.getById(postulantId).subscribe((p) => {
      const intPrevId = p.convPrev?.intPrev?.id ?? null;
      const convPrevId = p.convPrev?.id ?? null;

      // 🔑 1️⃣ RECARGAR OPCIONES DEL COMBO (SIN REGLAS)
      if (intPrevId) {
        this.filteredConvPrev = this.convPrev.filter(
          (c) => Number(c.intPrev?.id) === Number(intPrevId),
        );
      } else {
        this.filteredConvPrev = [];
      }

      // 🔑 2️⃣ MOSTRAR EXACTAMENTE LO QUE VIENE DE BD
      this.form.patchValue(
        {
          firstName: p.firstName ?? '',
          secondName: p.lastName ?? '',
          firstLastName: p.firstLastName ?? '',
          secondLastName: p.secondLastName ?? '',
          birthDate: p.birthdate ?? null,
          phone: p.phone ?? '',
          email: p.email ?? '',
          address: p.address ?? '',
          sex: p.sex?.id ?? null,
          commune: p.commune?.id ?? null,

          intPrev: intPrevId,
          convPrev: convPrevId,
        },
        { emitEvent: false },
      );
    });
  }

  private reloadReferente(): void {
    const contactId =
      this.register?.contact?.id ?? this.fichaAnterior?.contact?.id;

    if (!contactId) return;

    this.contactService.getById(contactId).subscribe((c) => {
      this.form.patchValue(
        {
          name: c.name ?? '',
          cellphone: c.cellphone ?? '',
          emailPostulant: c.email ?? '',
          contactDescription: c.description ?? '',
        },
        { emitEvent: false },
      );

      this.cdRef.detectChanges();
    });
  }

  private async recargarReferente(): Promise<void> {
    if (!this.register?.contact?.id) return;

    const contact = await firstValueFrom(
      this.contactService.getById(this.register.contact.id),
    );

    this.form.patchValue({
      name: contact.name,
      cellphone: contact.cellphone,
      emailPostulant: contact.email,
      contactDescription: contact.description,
    });

    this.cdRef.detectChanges();
  }

  onFechaSolicitudChange(fecha: string): void {
    if (!fecha) {
      this.diasTranscurridos = null;
      return;
    }

    const fechaSolicitud = new Date(fecha);
    const hoy = new Date();

    // Normalizar horas para evitar errores
    fechaSolicitud.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffMs = hoy.getTime() - fechaSolicitud.getTime();
    this.diasTranscurridos = Math.max(
      0,
      Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    );
  }
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------

  private getInvalidFields(): string[] {
    const invalid: string[] = [];

    if (this.form.get('rut')?.invalid) {
      return ['RUT válido'];
    }
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        invalid.push(this.fieldLabels[key] ?? key);
      }
    });

    return invalid;
  }

  private fieldLabels: Record<string, string> = {
    rut: 'RUT válido',
    firstName: 'Nombre',
    firstLastName: 'Apellido paterno',
    commune: 'Comuna',
    sex: 'Sexo',
    intPrev: 'Tipo de previsión',
    convPrev: 'Previsión',
    substance: 'Sustancia principal',
    contactTypes: 'Tipo de contacto',
    senders: 'Origen de la demanda',
    diverters: 'Derivador',
    state: 'Estado',
    result: 'Resultado',
    notRelevants: 'Motivo no relevante',
  };

  private marcarErrores(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        control.markAsTouched();
      }
    });

    this.cdRef.detectChanges();
  }

  //-------------------------------------------------------------------------------------------------------

  private aplicarReglaIngresoTratamiento(): void {
    if (!this.catalogsReady()) return;

    const resultadoActual = this.form.get('result')?.value;

    const ingreso = this.getResultadoIngresoTratamiento();
    const aceptado = this.getEstadoAceptado();
    const enTramite = this.getEstadoEnTramite();
    const ninguna = this.getNotRelevanteNinguna();

    if (!ingreso || !aceptado || !enTramite || !ninguna) return;

    if (resultadoActual === ingreso) {
      // 🟢 INGRESO A TRATAMIENTO
      this.form.patchValue(
        {
          state: aceptado,
          notRelevants: ninguna,
        },
        { emitEvent: false },
      );
    } else {
      // 🔵 Cualquier otro resultado
      this.form.patchValue(
        {
          state: enTramite,
          notRelevants: ninguna,
        },
        { emitEvent: false },
      );
    }
  }
  private getResultadoIngresoTratamiento(): number | null {
    return (
      this.results.find(
        (r: any) => this.normalize(r.name) === 'INGRESO A TRATAMIENTO',
      )?.id ?? null
    );
  }

  private getEstadoAceptado(): number | null {
    return (
      this.states.find((s: any) => this.normalize(s.name) === 'ACEPTADO')?.id ??
      null
    );
  }

  private getNotRelevanteNinguna(): number | null {
    return (
      this.notRelevants.find((n: any) => this.normalize(n.name) === 'NINGUNA')
        ?.id ?? null
    );
  }

  private getResultadoSinResultado(): number | null {
    return (
      this.results.find(
        (r: any) => this.normalize(r.name) === 'AUN SIN RESULTADO',
      )?.id ?? null
    );
  }

  private getEstadoEnTramite(): number | null {
    return (
      this.states.find((s: any) => this.normalize(s.name) === 'EN TRAMITE')
        ?.id ?? null
    );
  }

  private aplicarValoresPorDefectoNuevaDemanda(): void {
    const notRelevante = this.getNotRelevanteNinguna();
    const sinResultado = this.getResultadoSinResultado();
    const enTramite = this.getEstadoEnTramite();

    console.log('Defaults:', {
      notRelevante,
      sinResultado,
      enTramite,
    });

    this.form.patchValue(
      {
        notRelevants: notRelevante,
        result: sinResultado,
        state: enTramite,
      },
      { emitEvent: false },
    );
  }

  get citacionHeaderText(): string {
    return this.citacionCollapsed
      ? '➕ Agregar citación'
      : '📝 Agregando citación';
  }

  private moverFocoSeguro(): void {
    const rutInput = document.querySelector(
      'input[formcontrolname="rut"]',
    ) as HTMLInputElement;

    rutInput?.focus();
  }

  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------

  // ----------------------------------------------------------------------------------------------------------
  //  desde aqui hacia abajo manejo del comportamiento  del formulario
  // ----------------------------------------------------------------------------------------------------------

  //🔍 FLUJO RUT (INICIO REAL)

  private procesarFichas(registros: any[]): void {
    if (!Array.isArray(registros)) {
      console.error(
        '❌ procesarFichas recibió algo que NO es array',
        registros,
      );
      return;
    }
    const programList = JSON.parse(sessionStorage.getItem('programs') || '[]');
    const activeProgramName = this.tokenService.getActiveProgram();

    const activeProgram = programList.find(
      (p: any) => p.name === activeProgramName,
    );

    if (!activeProgram) {
      console.error('❌ Programa activo no encontrado');
      return;
    }

    this.fichasMismoPrograma = registros.filter(
      (r) => r.program?.id === activeProgram.id,
    );

    this.fichasOtrosProgramas = registros.filter(
      (r) => r.program?.id !== activeProgram.id,
    );

    this.mostrarPanelFichas = true;
    this.panelCerradoManualmente = false;

    this.cdRef.detectChanges();
  }

  private evaluarRutParaBusqueda(rutRaw: string | null): void {
    if (!rutRaw) return;

    const rut = rutRaw.toUpperCase().trim();
    const control = this.form.get('rut');

    const fullFormat = /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/;
    if (!fullFormat.test(rut)) {
      console.log('⛔ Formato incompleto');
      return;
    }

    if (control?.hasError('rutInvalido')) {
      console.log('⛔ RUT inválido');
      return;
    }
    this.searchByRut();
  }

  //-------------------------------------------------------------------------------------------------------
  // Buscar por Rut
  //-------------------------------------------------------------------------------------------------------

  async searchByRut(): Promise<void> {
    if (this.isSearchingRut) return;

    const rut = this.form.get('rut')?.value;
    if (!rut) return;

    if (rut === this.ultimoRutBuscado) return;

    this.isSearchingRut = true;

    try {
      const registros = await firstValueFrom(
        this.registerService.getAllByRut(rut),
      );

      // 🔎 Registrar búsqueda
      this.ultimoRutBuscado = rut;

      // 🧹 LIMPIEZA SIEMPRE
      this.fichasMismoPrograma = [];
      this.fichasOtrosProgramas = [];
      this.mostrarPanelFichas = false;

      // 🚫 SI NO HAY REGISTROS → NO MOSTRAR PANEL
      if (!registros || registros.length === 0) {
        return;
      }

      // 👉 Clasificación pura
      this.procesarFichas(registros);

      // ✅ SOLO SI QUEDÓ ALGO CLASIFICADO
      if (
        this.fichasMismoPrograma.length > 0 ||
        this.fichasOtrosProgramas.length > 0
      ) {
        this.mostrarPanelFichas = true;
        this.toggleBodyScroll(true);
      }
    } catch (e) {
      console.error('❌ Error buscando por RUT', e);
    } finally {
      this.isSearchingRut = false;
    }
  }

  //-------------------------------------------------------------------------------------------------------
  //🚦 ACCIONES DE USUARIO
  //-------------------------------------------------------------------------------------------------------

  async usarDatos(f: any): Promise<void> {
    this.ultimoRutBuscado = this.form.get('rut')?.value;
    this.cargandoPrevision = true;

    this.register = null;
    this.fichaAnterior = f;

    // 🔑 TRAER POSTULANTE COMPLETO
    const postulant = await firstValueFrom(
      this.postulantService.getById(f.postulant.id),
    );
    // 🔑 PREVISIÓN DESDE REGISTER
    const intPrevId = postulant.convPrev?.intPrev?.id ?? null;
    const convPrevId = postulant.convPrev?.id ?? null;
    // 🧩 PATCH GENERAL (SIN convPrev)
    this.form.patchValue(
      {
        rut: postulant.rut,
        firstName: postulant.firstName ?? '',
        secondName: postulant.lastName ?? '',
        firstLastName: postulant.firstLastName ?? '',
        secondLastName: postulant.secondLastName ?? '',
        birthDate: postulant.birthdate
          ? new Date(postulant.birthdate + 'T00:00:00')
          : null,
        phone: postulant.phone ?? '',
        email: postulant.email ?? '',
        address: postulant.address ?? '',
        commune: postulant.commune?.id ?? null,
        sex: postulant.sex?.id ?? null,

        // 👈 SOLO tipo previsión
        intPrev: intPrevId,

        // ✅ referente
        name: f.contact?.name ?? '',
        cellphone: f.contact?.cellphone ?? '',
        emailPostulant: f.contact?.email ?? '',
        contactDescription: f.contact?.description ?? '',

        contactTypes: f.contactType?.id ?? null,
        registerDescription: '',
      },
      { emitEvent: false },
    );

    setTimeout(() => {
      const rawBirth = this.form.get('birthDate')?.value;
      this.edad = this.utils.getEdadDesdeFecha(rawBirth);
      console.log('🧪 EDAD calculada (post patch):', this.edad);
    });

    // 1️⃣ Mostrar tipo previsión (visual)
    this.form.get('intPrev')?.setValue(intPrevId, { emitEvent: false });
    // 2️⃣ Mostrar SOLO la opción correcta (sin reglas)
    this.filteredConvPrev = this.convPrev.filter(
      (p: any) => Number(p.intPrev?.id) === Number(intPrevId),
    );
    // 3️⃣ Mostrar previsión real
    this.form.get('convPrev')?.setValue(convPrevId, { emitEvent: false });
    // 4️⃣ Asegurar estado BLOQUEADO (porque no es NEW)
    this.form.get('convPrev')?.disable({ emitEvent: false });
    this.form.get('intPrev')?.disable({ emitEvent: false });

    this.cargandoPrevision = false;
    this.toggleBodyScroll(false);
    this.cdRef.detectChanges();
  }

  //-------------------------------------------------------------------------------------------------------
  //🛠 HELPERS DE MODO / RESET
  //-------------------------------------------------------------------------------------------------------

  private bloquearCamposPostulante(): void {
    const camposPostulante = [
      'rut',
      'birthDate',
      'firstName',
      'secondName',
      'firstLastName',
      'secondLastName',
      'phone',
      'email',
      'address',
      'commune',
      'sex',
      'intPrev',
      'convPrev',
    ];

    camposPostulante.forEach((campo) => {
      const control = this.form.get(campo);
      if (control && control.enabled) {
        control.disable({ emitEvent: false });
      }
    });

    this.cdRef.detectChanges();
  }

  private habilitarCamposPostulante(): void {
    const camposPostulante = [
      'rut',
      'birthDate',
      'firstName',
      'secondName',
      'firstLastName',
      'secondLastName',
      'phone',
      'email',
      'address',
      'commune',
      'sex',
      'intPrev',
      'convPrev',
    ];

    camposPostulante.forEach((campo) => {
      const control = this.form.get(campo);
      if (control && control.disabled) {
        control.enable({ emitEvent: false });
      }
    });
  }

  private habilitarEstadoDemanda(): void {
    this.form.get('notRelevants')?.enable({ emitEvent: false });
    this.form.get('result')?.enable({ emitEvent: false });
    this.form.get('state')?.enable({ emitEvent: false });
  }

  //-------------------------------------------------------------------------------------------------------
  //🧮 ESTADO DE GUARDADO
  //-------------------------------------------------------------------------------------------------------

  isSaveDisabled(): boolean {
    if (this.saving) return true;

    switch (this.currentAction) {
      case 'EDIT':
        // En editar solo habilita si hay cambios
        return this.form.pristine;

      case 'NEW':
      case 'CLONE_SAME_PROGRAM':
      case 'CLONE_OTHER_PROGRAM':
        // En nueva o clonar, validar formulario
        return this.form.invalid;

      default:
        return true;
    }
  }

  private bloquearCamposReferente(): void {
    this.form.get('name')?.disable({ emitEvent: false });
    this.form.get('cellphone')?.disable({ emitEvent: false });
    this.form.get('emailPostulant')?.disable({ emitEvent: false });
    this.form.get('contactDescription')?.disable({ emitEvent: false });
    //this.form.get('contactTypes')?.disable({ emitEvent: false });
  }

  private habilitarCamposReferente(): void {
    this.form.get('name')?.enable({ emitEvent: false });
    this.form.get('cellphone')?.enable({ emitEvent: false });
    this.form.get('emailPostulant')?.enable({ emitEvent: false });
    this.form.get('contactDescription')?.enable({ emitEvent: false });
    //this.form.get('contactTypes')?.enable({ emitEvent: false });
  }

  private habilitarBotonesEdicion(): void {
    this.canClearForm = true;
    this.canEditPostulant = true;
  }

  private ocultarBotonesEdicion(): void {
    this.canClearForm = false;
    this.canEditPostulant = false;
  }

  //-------------------------------------------------------------------------------------------------------
  get isNew(): boolean {
    return this.currentAction === 'NEW';
  }

  //-------------------------------------------------------------------------------------------------------
  cerrarPanelFichas(): void {
    this.panelCerradoManualmente = true;
    // 🔥 CLAVE: permitir volver a buscar el mismo RUT
    this.ultimoRutBuscado = null;
    this.toggleBodyScroll(false);
    // 👉 cerrar NO decide lógica clínica
    this.mostrarPanelFichas = false;
  }

  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  // CENTRAL DE LA TOMA DECISIONES SEGUN SELECCION DE LAS FICHAS
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------

  async seleccionarUsoDeFicha(
    f: any,
    accion: 'EDITAR' | 'USAR_DATOS',
  ): Promise<void> {
    this.loader.lock(); // 🔒 BLOQUEAR VISTA

    try {
      // ==================================================
      // 🧹 0️⃣ RESET TOTAL — FORMULARIO COMO RECIÉN CARGADO
      // ==================================================
      this.ultimoRutBuscado = null;
      this.estadoFormulario = null;
      this.mostrarBloqueoPostulante = false;

      // 🔹 Estado lógico
      this.register = null;
      this.fichaAnterior = null;
      this.cargandoPrevision = false;

      // 🔹 Estado UI
      this.mostrarPanelFichas = false;
      this.toggleBodyScroll(false);

      // 🔹 Flags UX
      this.panelCerradoManualmente = false;

      // 🔹 Secciones dinámicas
      this.movements = [];
      this.citacionCollapsed = true;

      // 🔹 Estado de campos — TODO habilitado
      this.habilitarCamposPostulante();
      this.habilitarCamposReferente();
      this.habilitarEstadoDemanda();

      this.mostrarBloqueoPostulante = false;

      // 🔹 Reset duro del formulario
      this.form.reset();
      this.form.markAsPristine();
      this.form.markAsUntouched();

      // 🔹 Flags UI base
      this.canClearForm = false;
      this.canEditPostulant = false;

      this.ocultarBotonesEdicion();
      // ==================================================
      // 🧭 1️⃣ CONTEXTO DE PROGRAMA ACTIVO
      // ==================================================

      const activeProgramId = this.getActiveProgramId();

      // ==================================================
      // 🔵 CASO 1: FICHA DEL MISMO PROGRAMA
      // ==================================================
      if (f.program?.id === activeProgramId) {
        // ----------------------------------------------
        // 🔵 A. EDITAR DEMANDA EXISTENTE
        // ----------------------------------------------
        if (accion === 'EDITAR') {
          this.currentAction = 'EDIT';
          this.actionLabel = '🔵 Modificando Demanda';
          // 🔥 AQUÍ ESTABA EL PROBLEMA
          this.loadDemandCompleta(f.id);

          queueMicrotask(() => {
            // 🎛️ UI
            this.canClearForm = true;
            this.canEditPostulant = true;
            this.habilitarBotonesEdicion();

            // 🔒 Bloqueos
            //this.bloquearCamposPostulante();
            this.bloquearCamposReferente();
            this.mostrarBloqueoPostulante = true;

            this.cdRef.detectChanges();
          });
          return;
        }

        // ----------------------------------------------
        // 🟠 B. USAR DATOS (MISMO PROGRAMA)
        // ----------------------------------------------
        else {
          this.currentAction = 'CLONE_SAME_PROGRAM';
          this.actionLabel =
            '🟠 Nueva Demanda (usando datos del mismo programa)';
          this.usarDatos(f);
        }
      }

      // ==================================================
      // 🟣 CASO 2: FICHA DE OTRO PROGRAMA
      // ==================================================
      else {
        this.currentAction = 'CLONE_OTHER_PROGRAM';
        this.actionLabel = '🟠 Nueva Demanda (usando datos de otro programa)';
        this.usarDatos(f);
      }

      // ==================================================
      // 📦 2️⃣ CARGA DE DATOS (NEUTRA, SIN DECISIÓN)
      // ==================================================
      queueMicrotask(() => {
        // 🎛️ UI
        this.canClearForm = true;
        this.canEditPostulant = true;
        this.habilitarBotonesEdicion();
        // 🔒 Bloqueos
        this.bloquearCamposPostulante();
        this.bloquearCamposReferente();

        this.cdRef.detectChanges();
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.loader.unlock(); // 🔓 SIEMPRE LIBERAR
    }
  }

  // ==================================================
  // Nueva demanda de cero
  // ==================================================

  nuevaDemanda(): void {
    // 🧹 Estado base
    this.resetFormularioBase();

    this.currentAction = 'NEW';
    this.actionLabel = '🟢 Nueva Demanda';

    // 🧠 Defaults clínicos
    this.aplicarValoresPorDefectoNuevaDemanda();

    // 🎛️ UI
    this.canClearForm = false;
    this.canEditPostulant = false;
    this.estadoFormulario = null;

    this.mostrarBloqueoPostulante = false;

    this.cdRef.detectChanges();
  }

  // ==================================================
  // 🧹 RESET TOTAL — FORMULARIO COMO RECIÉN CARGADO
  // ==================================================

  private resetFormularioBase(): void {
    // 🔹 Estado lógico
    this.register = null;
    this.fichaAnterior = null;
    this.cargandoPrevision = false;

    // 🔹 Estado UI
    this.mostrarPanelFichas = false;
    this.toggleBodyScroll(false);

    // 🔹 Flags UX
    this.panelCerradoManualmente = false;

    // 🔹 Secciones dinámicas
    this.movements = [];
    this.citacionCollapsed = true;

    // 🔹 Estado de campos — TODO habilitado
    this.habilitarCamposPostulante();
    this.habilitarCamposReferente();
    this.habilitarEstadoDemanda();

    // 🔹 Reset duro del formulario
    this.form.reset({
      birthDate: null,
      substance: null,
      secondarySubstances: [], // 👈 CLAVE ABSOLUTA
    });

    this.observacionesDraft = [];
    this.observacionEnEdicion = null;

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  // -----------------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------------
  // timbre de agua
  // -----------------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------------

  get watermarkText(): string | null {
    const resultado = this.selectedResult;
    const estado = this.selectedEstado;

    const sinResultadoId = this.getResultadoSinResultado();

    // 1️⃣ Resultado clínico REAL (no "AÚN SIN RESULTADO")
    if (resultado && resultado.id !== sinResultadoId) {
      return resultado.name.toUpperCase();
    }

    // 2️⃣ Estado de la demanda
    if (estado) {
      return estado.name.toUpperCase();
    }

    // 3️⃣ Ingreso en curso (SOLO si es demanda nueva)
    if (this.currentAction === 'NEW') {
      const iniciado =
        !!this.form.get('rut')?.value ||
        !!this.form.get('firstName')?.value ||
        !!this.form.get('firstLastName')?.value;

      return iniciado ? 'INGRESO EN CURSO' : null;
    }

    return null;
  }

  get watermarkColor(): string {
    const resultado = this.selectedResult;
    const estado = this.selectedEstado;

    const sinResultadoId = this.getResultadoSinResultado();

    if (resultado && resultado.id !== sinResultadoId) {
      return '#2e7d32'; // verde clínico real
    }

    if (estado) {
      return this.getEstadoColor();
    }

    return '#90a4ae';
  }

  getStateLabel(state: string): string {
    switch (state) {
      case 'AGENDADO':
        return 'Agendado';
      case 'SE_PRESENTO':
        return 'Se presentó';
      case 'NO_SE_PRESENTO':
        return 'No se presentó';
      case 'CANCELA_PROGRAMA':
        return 'Cancela programa';
      default:
        return state;
    }
  }

  getEstadoColor(): string {
    const estado = this.selectedEstado;

    if (!estado) return '#90a4ae';

    switch (estado.code) {
      case 'EN_TRAMITE':
        return '#1565c0';
      case 'EN_ESPERA':
        return '#f9a825';
      case 'EGRESADO':
        return '#2e7d32';
      case 'ABANDONO':
        return '#c62828';
      case 'DERIVADO':
        return '#6a1b9a';
      default:
        return '#546e7a';
    }
  }

  getStateIcon(state: string): string {
    switch (state) {
      case 'AGENDADO':
        return 'event';
      case 'SE_PRESENTO':
        return 'check_circle';
      case 'NO_SE_PRESENTO':
        return 'person_off';
      case 'CANCELA_PROGRAMA':
        return 'cancel';
      default:
        return 'help';
    }
  }

  private setEstadoFormularioFromRegister(register: Register | null): void {
    this.estadoFormulario = register?.state?.id ?? null;
  }

  get selectedResult(): any | null {
    const resultId = this.form.get('result')?.value;
    if (!resultId || !this.results?.length) return null;

    return this.results.find((r) => r.id === resultId) ?? null;
  }

  get selectedEstado(): any | null {
    if (!this.estadoFormulario) return null;
    return this.states.find((s) => s.id === this.estadoFormulario) ?? null;
  }
}
