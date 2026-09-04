import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize } from 'rxjs';

import {
  DemandService,
  PurgeEpisodeResponse,
} from '../../core/services/demand.service';
import { PreloadCatalogsService } from '@app/services/demand/preload-catalogs.service';
import { ProgramProfessionalService } from '@app/services/program-professional.service';
import { normalizeProfessionalForCitation } from '../demand-new/utils/demand-new-professional.utils';
import { resolveCitationTypeCode } from '../demand-new/utils/demand-new-citation-schedule.utils';
import { DEMAND_CITATION_CODES } from '../../shared/utils/demand-workflow.utils';
import {
  DemandNewDateAdapter,
  DEMAND_NEW_DATE_FORMATS,
} from '../demand-new/utils/demand-new-date-adapter';
import { parseBackendDate } from '../demand-new/utils/demand-new-format.utils';
import {
  buildAdministrativeObservationCorrections,
  syncAdministrativeObservationDrafts,
} from './utils/administrative-observation-correction.utils';
import { buildAdministrativeCitationAttendanceCorrections } from './utils/administrative-citation-attendance-correction.utils';

import { buildAdministrativeFeedbackCorrections } from './utils/administrative-feedback-correction.utils';
@Component({
  standalone: true,
  selector: 'app-episode-purge',
  templateUrl: './episode-purge.component.html',
  styleUrls: ['./episode-purge.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: MAT_DATE_FORMATS, useValue: DEMAND_NEW_DATE_FORMATS },
    { provide: DateAdapter, useClass: DemandNewDateAdapter },
  ],
})
export class EpisodePurgeComponent {
  private readonly demandService = inject(DemandService);
  private readonly preloadCatalogs = inject(PreloadCatalogsService);
  private readonly programProfessionalService = inject(
    ProgramProfessionalService,
  );
  private readonly snackBar = inject(MatSnackBar);

  episodeIdInput: number | null = null;
  confirmationCode = '';

  longitudinal: any = null;
  episode: any = null;
  purgeResult: PurgeEpisodeResponse | null = null;

  loading = false;
  purging = false;
  reversing = false;
  reversalReason = '';
  reversalObservation = '';
  errorMessage = '';
  directPurgeAvailable = false;

  adminMode: 'correction' | 'reversal' | 'purge' | null = null;
  selectedProgramForAdminAction: number | null = null;
  episodePrograms: any[] = [];
  professionals: any[] = [];
  isLoadingProfessionals = false;
  professionalsError = '';
  citationRows: any[] = [];
  feedbackDraft: any = null;

  referenceDrafts: any[] = [];
  observationDrafts: any[] = [];
  closureDraft: any = null;
  feedbackResults: any[] = [];
  private nextTemporaryEventId = -1;
  correctionDraft: any = null;
  correctionEvents: any[] = [];
  episodeSubstances: any[] = [];

  episodeTypes: any[] = [];
  eventTypes: any[] = [];
  attendanceStatuses: any[] = [];
  citationTypes: any[] = [];
  biopsychosocialCommitmentLevels: any[] = [];
  closureReasons: any[] = [];
  results: any[] = [];
  contactTypes: any[] = [];
  senders: any[] = [];
  diverters: any[] = [];
  programs: any[] = [];
  substances: any[] = [];

  correctionCatalogsLoading = false;
  correctionCatalogsError = '';

  correctionReason = '';
  correcting = false;
  get episodeId(): number | null {
    const value = Number(this.episodeIdInput);

    return Number.isInteger(value) && value > 0 ? value : null;
  }

  normalizeCorrectionDate(target: any, field: string): void {
    if (!target || !field) {
      return;
    }

    const raw = String(target[field] ?? '').trim();

    if (!raw) {
      target[field] = null;
      return;
    }

    const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);

    if (displayMatch) {
      target[field] =
        displayMatch[3] + '-' + displayMatch[2] + '-' + displayMatch[1];

      return;
    }

    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

    if (isoMatch) {
      return;
    }
  }

  formatCorrectionDate(value: unknown): string {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return 'Sin fecha';
    }

    const datePart = raw.slice(0, 10);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

    if (!match) {
      return raw;
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  get episodeCode(): string {
    const value =
      this.episode?.episodeCode ??
      this.episode?.code ??
      this.episode?.episode?.code ??
      '';

    return String(value).trim();
  }

  get confirmationTarget(): string {
    return this.episodeCode || String(this.episodeId ?? '');
  }

  get personName(): string {
    const person =
      this.longitudinal?.postulant ??
      this.episode?.postulant ??
      this.episode?.person ??
      null;

    if (!person) {
      return 'Persona no informada';
    }

    const explicitName = person.fullName ?? person.name;

    if (explicitName) {
      return String(explicitName);
    }

    return (
      [
        person.firstName,
        person.firstLastName ?? person.lastName,
        person.secondLastName,
      ]
        .filter(Boolean)
        .join(' ') || 'Persona no informada'
    );
  }

  get personRut(): string {
    const person =
      this.longitudinal?.postulant ??
      this.episode?.postulant ??
      this.episode?.person ??
      null;

    return String(person?.rut ?? person?.run ?? 'No informado');
  }

  get programName(): string {
    const stages = Array.isArray(this.longitudinal?.stages)
      ? this.longitudinal.stages
      : [];

    const stage =
      stages.find(
        (item: any) =>
          item?.current === true ||
          item?.isCurrent === true ||
          item?.active === true,
      ) ??
      stages[stages.length - 1] ??
      null;

    return String(
      this.episode?.currentProgram?.name ??
        stage?.program?.name ??
        'No informado',
    );
  }

  get stateLabel(): string {
    return String(
      this.episode?.state?.name ??
        this.episode?.state?.code ??
        this.episode?.stateCode ??
        this.episode?.status ??
        'No informado',
    );
  }

  get deletionConfirmed(): boolean {
    const expected = this.normalize(this.confirmationTarget);
    const entered = this.normalize(this.confirmationCode);

    return (
      !!this.episodeId &&
      !!expected &&
      entered === expected &&
      !this.loading &&
      !this.purging
    );
  }

  get deletedRows(): Array<[string, number]> {
    return Object.entries(this.purgeResult?.deletedRows ?? {});
  }

  private loadCorrectionCatalogs(): void {
    this.correctionCatalogsLoading = true;
    this.correctionCatalogsError = '';

    this.demandService.getCatalogs().subscribe({
      next: (catalogs) => {
        this.episodeTypes = catalogs?.episodeTypes ?? [];
        this.eventTypes = catalogs?.eventTypes ?? [];
        this.attendanceStatuses = catalogs?.attendanceStatuses ?? [];
        this.citationTypes = catalogs?.citationTypes ?? [];
        this.biopsychosocialCommitmentLevels =
          catalogs?.biopsychosocialCommitmentLevels ?? [];
        this.closureReasons = catalogs?.closureReasons ?? [];
        if (this.correctionEvents.length) {
          this.buildClosureDraft();
        }
      },
      error: (error) => {
        console.error(
          '[EpisodePurge] Error cargando catálogos de demanda:',
          error,
        );

        this.episodeTypes = [];
        this.eventTypes = [];
        this.attendanceStatuses = [];
        this.citationTypes = [];
        this.biopsychosocialCommitmentLevels = [];
        this.closureReasons = [];
        this.correctionCatalogsError =
          'No fue posible cargar los tipos de episodio.';
      },
    });

    this.preloadCatalogs.loadAll().subscribe({
      next: (data) => {
        this.contactTypes = data?.contactTypes ?? [];
        this.senders = data?.senders ?? [];
        this.diverters = data?.diverters ?? [];
        this.programs = data?.programs?.content ?? data?.programs ?? [];
        this.substances = data?.substances ?? [];
        this.results = data?.results ?? [];
        if (this.correctionEvents.length) {
          this.buildFeedbackDraft();
        }

        this.correctionCatalogsLoading = false;
      },
      error: (error) => {
        console.error(
          '[EpisodePurge] Error cargando catálogos auxiliares:',
          error,
        );

        this.contactTypes = [];
        this.senders = [];
        this.diverters = [];
        this.programs = [];
        this.substances = [];
        this.results = [];

        this.correctionCatalogsLoading = false;

        this.correctionCatalogsError =
          'No fue posible cargar los catálogos para la corrección administrativa.';
      },
    });
  }

  private loadCorrectionSubstances(): void {
    const episodeId = this.episodeId;

    this.episodeSubstances = [];

    if (!episodeId) {
      return;
    }

    this.demandService.getEpisodeSubstances(episodeId).subscribe({
      next: (items) => {
        this.episodeSubstances = Array.isArray(items) ? items : [];

        const primarySubstance =
          this.episodeSubstances.find(
            (item: any) => item?.primarySubstance === true,
          ) ?? null;

        const secondarySubstances = this.episodeSubstances
          .filter((item: any) => item?.primarySubstance !== true)
          .sort(
            (left: any, right: any) =>
              Number(left?.useOrder ?? 0) - Number(right?.useOrder ?? 0),
          )
          .map((item: any) => ({
            id: item?.id ?? null,
            substanceId: item?.substanceId ?? null,
            substanceName: item?.substanceName ?? '',
            useOrder: item?.useOrder ?? null,
            observation: item?.observation ?? '',
          }));

        if (this.correctionDraft) {
          this.correctionDraft.primarySubstanceId =
            primarySubstance?.substanceId ?? null;

          this.correctionDraft.secondarySubstances = secondarySubstances;
        }

        console.log(
          '[EpisodePurge] Sustancias del episodio:',
          this.episodeSubstances,
        );
      },
      error: (error) => {
        console.error('[EpisodePurge] Error cargando sustancias:', error);

        this.episodeSubstances = [];
      },
    });
  }

  selectAdministrativeSubstancePrincipal(id: number): void {
    if (!this.correctionDraft) return;

    this.correctionDraft.primarySubstanceId = id;

    const current = Array.isArray(this.correctionDraft.secondarySubstances)
      ? this.correctionDraft.secondarySubstances
      : [];

    this.correctionDraft.secondarySubstances = current
      .filter((item: any) => Number(item?.substanceId) !== Number(id))
      .map((item: any, index: number) => ({
        ...item,
        useOrder: index + 1,
      }));
  }

  getAdministrativeSubstanceOrder(id: number): number | null {
    const current = Array.isArray(this.correctionDraft?.secondarySubstances)
      ? this.correctionDraft.secondarySubstances
      : [];

    const index = current.findIndex(
      (item: any) => Number(item?.substanceId) === Number(id),
    );

    return index >= 0 ? index + 1 : null;
  }

  toggleAdministrativeSubstanceSecondary(id: number): void {
    if (!this.correctionDraft) return;

    if (Number(this.correctionDraft.primarySubstanceId) === Number(id)) {
      return;
    }

    const current = Array.isArray(this.correctionDraft.secondarySubstances)
      ? this.correctionDraft.secondarySubstances
      : [];

    const existingIndex = current.findIndex(
      (item: any) => Number(item?.substanceId) === Number(id),
    );

    if (existingIndex >= 0) {
      this.correctionDraft.secondarySubstances = current
        .filter((_: any, index: number) => index !== existingIndex)
        .map((item: any, index: number) => ({
          ...item,
          useOrder: index + 1,
        }));

      return;
    }

    const catalogItem = this.substances.find(
      (item: any) => Number(item?.id) === Number(id),
    );

    this.correctionDraft.secondarySubstances = [
      ...current,
      {
        id: null,
        substanceId: id,
        substanceName: catalogItem?.name ?? '',
        useOrder: current.length + 1,
        observation: '',
        level: 'Secundaria',
      },
    ];
  }

  compareCorrectionCatalogItems(left: any, right: any): boolean {
    if (left === right) {
      return true;
    }

    if (!left || !right) {
      return false;
    }

    const leftId = Number(left?.id);
    const rightId = Number(right?.id);

    if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
      return leftId === rightId;
    }

    return (
      String(left?.code ?? '')
        .trim()
        .toUpperCase() ===
      String(right?.code ?? '')
        .trim()
        .toUpperCase()
    );
  }

  isCorrectionEventType(event: any, code: string): boolean {
    return (
      String(event?.eventType?.code ?? '')
        .trim()
        .toUpperCase() ===
      String(code ?? '')
        .trim()
        .toUpperCase()
    );
  }

  isCorrectionEventLocked(event: any): boolean {
    return (
      String(event?.eventType?.code ?? '')
        .trim()
        .toUpperCase() === 'REFERENCIA'
    );
  }

  private loadEpisodePrograms(): void {
    const selectedEpisodeId = Number(this.episodeId);

    const stages = Array.isArray(this.longitudinal?.stages)
      ? this.longitudinal.stages.filter(
          (stage: any) =>
            !stage?.episodeId || Number(stage?.episodeId) === selectedEpisodeId,
        )
      : [];

    const uniquePrograms = new Map<number, any>();

    stages.forEach((stage: any) => {
      const programId = Number(stage?.program?.id ?? stage?.programId ?? 0);

      if (!programId) {
        return;
      }

      if (!uniquePrograms.has(programId)) {
        uniquePrograms.set(programId, {
          id: programId,
          name:
            stage?.program?.name ??
            stage?.programName ??
            'Programa ' + programId,
        });
      }
    });

    this.episodePrograms = Array.from(uniquePrograms.values());
  }

  selectAdminAction(mode: 'correction' | 'reversal' | 'purge'): void {
    this.adminMode = mode;

    this.selectedProgramForAdminAction = null;

    if (mode !== 'correction') {
      this.correctionDraft = null;
      this.correctionEvents = [];
    }

    if (mode === 'purge') {
      return;
    }
  }

  onCorrectionCitationProfessionalChange(
    citation: any,
    professionalId: number,
  ): void {
    if (!citation) {
      return;
    }

    const normalizedProfessionalId = Number(professionalId);

    const professional = this.professionals.find(
      (item: any) => Number(item?.id) === normalizedProfessionalId,
    );

    citation.programProfessionalId = normalizedProfessionalId || null;

    citation.programProfessionalName = professional?.name ?? null;

    citation.professionName = professional?.professionName ?? null;
  }

  private resolveSelectedProgramStageId(): number | null {
    const programId = Number(this.selectedProgramForAdminAction);

    if (!programId) {
      return null;
    }

    const programStages = Array.isArray(this.longitudinal?.stages)
      ? this.longitudinal.stages.filter(
          (stage: any) =>
            Number(stage?.program?.id ?? stage?.programId ?? 0) === programId,
        )
      : [];

    if (programStages.length === 1) {
      const stageId = Number(
        programStages[0]?.id ?? programStages[0]?.stageId ?? 0,
      );

      return stageId > 0 ? stageId : null;
    }

    const stageIds = Array.from(
      new Set(
        this.correctionEvents
          .map((event: any) => Number(event?.stageId ?? event?.stage?.id ?? 0))
          .filter((stageId: number) => stageId > 0),
      ),
    );

    return stageIds.length === 1 ? stageIds[0] : null;
  }

  addCorrectionCitation(row: any): void {
    if (!row?.code) {
      return;
    }

    const episodeId = Number(this.episodeId);
    const programId = Number(this.selectedProgramForAdminAction);
    const stageId = this.resolveSelectedProgramStageId();

    if (!episodeId || !programId || !stageId) {
      this.snackBar.open(
        'No fue posible identificar de forma segura la etapa del programa seleccionado.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    const program =
      this.episodePrograms.find(
        (item: any) => Number(item?.id) === programId,
      ) ?? null;

    const citationType =
      this.citationTypes.find((item: any) => item?.code === row.code) ?? null;

    const temporaryId = this.nextTemporaryEventId--;

    const citation = {
      id: temporaryId,
      temporary: true,

      episodeId,
      stageId,

      programId,
      program: program
        ? {
            id: programId,
            name: program.name,
          }
        : {
            id: programId,
            name: 'Programa ' + programId,
          },

      eventTypeCode: 'CITACION',

      citationTypeCode: row.code,
      citationType,

      eventDate: null,
      eventTime: '',

      programProfessionalId: null,
      programProfessionalName: null,
      professionName: null,

      comment: '',
      observation: null,

      attendanceStatus: null,
      relatedEventId: null,
    };

    this.correctionEvents.push(citation);
    this.buildCitationRows();
  }

  addCorrectionAttendance(attempt: any): void {
    const citation = attempt?.citation;

    if (!citation) {
      return;
    }

    if (attempt?.attendance) {
      return;
    }

    const citationId = Number(citation?.id);
    const episodeId = Number(citation?.episodeId);
    const stageId = Number(citation?.stageId);
    const programId = Number(
      citation?.program?.id ??
        citation?.programId ??
        this.selectedProgramForAdminAction,
    );

    if (!citationId || !episodeId || !stageId || !programId) {
      this.snackBar.open(
        'No fue posible identificar la citación o su etapa.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    const temporaryId = this.nextTemporaryEventId--;

    const attendance = {
      id: temporaryId,
      temporary: true,

      episodeId,
      stageId,

      programId,
      program: citation?.program ?? {
        id: programId,
        name: 'Programa ' + programId,
      },

      eventTypeCode: 'ASISTENCIA',

      eventDate: citation?.eventDate ?? null,
      eventTime: citation?.eventTime ?? '',

      relatedEventId: citationId,

      attendanceStatus: null,

      programProfessionalId: citation?.programProfessionalId ?? null,

      programProfessionalName: citation?.programProfessionalName ?? null,

      professionName: citation?.professionName ?? null,

      comment: '',
      observation: null,
    };

    this.correctionEvents.push(attendance);
    this.buildCitationRows();
  }

  removeCorrectionCitation(attempt: any): void {
    const citation = attempt?.citation;

    if (!citation) {
      return;
    }

    const citationId = Number(citation?.id);

    const relatedAttendances = Array.isArray(this.correctionEvents)
      ? this.correctionEvents.filter((event: any) => {
          const eventTypeCode = String(
            event?.eventType?.code ?? event?.eventTypeCode ?? '',
          )
            .trim()
            .toUpperCase();

          if (eventTypeCode !== 'ASISTENCIA') {
            return false;
          }

          const relatedEventId = Number(
            event?.relatedEventId ??
              event?.relatedEvent?.id ??
              event?.citationEventId ??
              event?.citationId ??
              0,
          );

          return citationId !== 0 && relatedEventId === citationId;
        })
      : [];

    if (citation?.temporary === true || citationId < 0) {
      this.correctionEvents = this.correctionEvents.filter(
        (event: any) =>
          event !== citation && !relatedAttendances.includes(event),
      );
    } else {
      citation.markedForDeletion = true;

      relatedAttendances.forEach((attendance: any) => {
        if (attendance?.temporary === true || Number(attendance?.id) < 0) {
          const index = this.correctionEvents.indexOf(attendance);

          if (index >= 0) {
            this.correctionEvents.splice(index, 1);
          }
        } else {
          attendance.markedForDeletion = true;
        }
      });
    }

    this.buildCitationRows();
  }

  restoreCorrectionCitation(attempt: any): void {
    const citation = attempt?.citation;

    if (!citation) {
      return;
    }

    citation.markedForDeletion = false;

    const citationId = Number(citation?.id);

    this.correctionEvents.forEach((event: any) => {
      const eventTypeCode = String(
        event?.eventType?.code ?? event?.eventTypeCode ?? '',
      )
        .trim()
        .toUpperCase();

      if (eventTypeCode !== 'ASISTENCIA') {
        return;
      }

      const relatedEventId = Number(
        event?.relatedEventId ??
          event?.relatedEvent?.id ??
          event?.citationEventId ??
          event?.citationId ??
          0,
      );

      if (citationId !== 0 && relatedEventId === citationId) {
        event.markedForDeletion = false;
      }
    });

    this.buildCitationRows();
  }

  removeCorrectionAttendance(attempt: any): void {
    const attendance = attempt?.attendance;

    if (!attendance) {
      return;
    }

    const attendanceId = Number(attendance?.id);

    if (attendance?.temporary === true || attendanceId < 0) {
      const index = this.correctionEvents.indexOf(attendance);

      if (index >= 0) {
        this.correctionEvents.splice(index, 1);
      }
    } else {
      attendance.markedForDeletion = true;
    }

    this.buildCitationRows();
  }

  restoreCorrectionAttendance(attempt: any): void {
    const attendance = attempt?.attendance;

    if (!attendance) {
      return;
    }

    attendance.markedForDeletion = false;

    this.buildCitationRows();
  }
  /**
   * Normaliza una fecha escrita manualmente usando exactamente
   * el mismo DateAdapter empleado por demand-new.
   *
   * Ejemplos aceptados dependen de DemandNewDateAdapter:
   * DD/MM/AAAA, DDMMAAAA, etc.
   */
  normalizeCorrectionDateInput(
    event: FocusEvent,
    target: any,
    property: string,
  ): void {
    const input = event.target as HTMLInputElement | null;

    if (!input || !target || !property) {
      return;
    }

    const rawValue = input.value?.trim();

    if (!rawValue) {
      return;
    }

    const adapter = new DemandNewDateAdapter('es-CL');
    const parsedDate = adapter.parse(rawValue);

    if (!parsedDate) {
      this.snackBar.open(
        'Ingrese una fecha válida. Use DD/MM/AAAA.',
        'Cerrar',
        {
          duration: 3500,
        },
      );

      return;
    }

    target[property] = parsedDate;
    input.value = adapter.format(parsedDate);
  }

  /**
   * Replica la ayuda de escritura de hora usada en demand-new.
   *
   * 930   -> 09:30
   * 1530  -> 15:30
   * 9:30  -> 09:30
   */
  formatCorrectionHourInput(
    target: any,
    property: string,
  ): void {
    if (!target || !property) {
      return;
    }

    const raw = String(target[property] ?? '')
      .replace(/\D/g, '')
      .slice(0, 4);

    if (!raw) {
      target[property] = '';
      return;
    }

    let formatted = raw;

    if (raw.length >= 3) {
      formatted = `${raw.slice(0, raw.length - 2)}:${raw.slice(-2)}`;
    }

    if (
      formatted.length === 4 &&
      formatted.startsWith('0') === false
    ) {
      formatted = `0${formatted}`;
    }

    target[property] = formatted;

    const valid =
      /^([01]\d|2[0-3]):[0-5]\d$/.test(formatted);

    if (!valid && formatted.length === 5) {
      this.snackBar.open(
        'Ingrese una hora válida entre 00:00 y 23:59.',
        'Cerrar',
        {
          duration: 3500,
        },
      );
    }
  }
  addCorrectionObservation(): void {
    const episodeId = Number(this.episodeId);
    const programId = Number(this.selectedProgramForAdminAction);
    const stageId = this.resolveSelectedProgramStageId();

    if (!episodeId || !programId || !stageId) {
      this.snackBar.open(
        'No fue posible identificar de forma segura la etapa del programa seleccionado.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    const program =
      this.episodePrograms.find(
        (item: any) => Number(item?.id) === programId,
      ) ?? null;

    const temporaryId = this.nextTemporaryEventId--;

    const observation = {
      id: temporaryId,
      temporary: true,

      episodeId,
      stageId,

      programId,
      program: program
        ? {
            id: programId,
            name: program.name,
          }
        : {
            id: programId,
            name: 'Programa ' + programId,
          },

      eventTypeCode: 'OBSERVACION',

      eventDate: new Date(),
      eventTime: '',

      comment: '',
      observation: '',
    };

    this.correctionEvents.push(observation);
    this.buildObservationDrafts();
  }

  removeCorrectionObservation(observation: any): void {
    const observationId = Number(observation?.id);

    if (!Number.isFinite(observationId)) {
      return;
    }

    const eventIndex = this.correctionEvents.findIndex(
      (event: any) => Number(event?.id) === observationId,
    );

    if (eventIndex < 0) {
      return;
    }

    const event = this.correctionEvents[eventIndex];

    if (event?.temporary === true || observationId < 0) {
      this.correctionEvents.splice(eventIndex, 1);
    } else {
      event.markedForDeletion = true;
    }

    this.buildObservationDrafts();
  }

  addCorrectionFeedback(): void {
    const episodeId = Number(this.episodeId);
    const programId = Number(this.selectedProgramForAdminAction);
    const stageId = this.resolveSelectedProgramStageId();

    if (!episodeId || !programId || !stageId) {
      this.snackBar.open(
        'No fue posible identificar de forma segura la etapa del programa seleccionado.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    const program =
      this.episodePrograms.find(
        (item: any) => Number(item?.id) === programId,
      ) ?? null;

    const temporaryId = this.nextTemporaryEventId--;

    const feedback = {
      id: temporaryId,
      temporary: true,

      episodeId,
      stageId,

      programId,
      program: program
        ? {
            id: programId,
            name: program.name,
          }
        : {
            id: programId,
            name: 'Programa ' + programId,
          },

      eventTypeCode: 'RETROALIMENTACION',

      eventDate: null,
      eventTime: '',

      programProfessionalId: null,
      programProfessionalName: null,
      professionName: null,

      biopsychosocialCommitmentLevel: null,
      biopsychosocialCommitmentCode: null,

      result: null,
      resultCode: null,

      comment: '',
      observation: null,
    };

    this.correctionEvents.push(feedback);

    this.feedbackDraft = feedback;
  }

  removeCorrectionFeedback(): void {
    const feedback = this.feedbackDraft;

    if (!feedback) {
      return;
    }

    const feedbackId = Number(feedback?.id);

    const eventIndex = this.correctionEvents.findIndex(
      (event: any) =>
        event === feedback ||
        (Number.isFinite(feedbackId) && Number(event?.id) === feedbackId),
    );

    if (eventIndex < 0) {
      return;
    }

    const event = this.correctionEvents[eventIndex];

    if (event?.temporary === true || feedbackId < 0) {
      this.correctionEvents.splice(eventIndex, 1);

      this.feedbackDraft = null;
      return;
    }

    event.markedForDeletion = true;
    this.feedbackDraft = event;
  }

  restoreCorrectionFeedback(): void {
    const feedback = this.feedbackDraft;

    if (!feedback) {
      return;
    }

    feedback.markedForDeletion = false;
  }
  onCorrectionFeedbackProfessionalChange(professionalId: number): void {
    if (!this.feedbackDraft) {
      return;
    }

    const normalizedProfessionalId = Number(professionalId);

    const professional = this.professionals.find(
      (item: any) => Number(item?.id) === normalizedProfessionalId,
    );

    this.feedbackDraft.programProfessionalId = normalizedProfessionalId || null;

    this.feedbackDraft.programProfessionalName = professional?.name ?? null;

    this.feedbackDraft.professionName = professional?.professionName ?? null;
  }

  onCorrectionFeedbackResultChange(result: any): void {
    if (!this.feedbackDraft) {
      return;
    }

    this.feedbackDraft.result = result ?? null;
    this.feedbackDraft.resultCode = result?.code ?? null;
  }

  onCorrectionFeedbackCommitmentChange(level: any): void {
    if (!this.feedbackDraft) {
      return;
    }

    this.feedbackDraft.biopsychosocialCommitmentLevel = level ?? null;

    this.feedbackDraft.biopsychosocialCommitmentCode = level?.code ?? null;
  }

  private buildObservationDrafts(): void {
    const observationEvents = this.correctionEvents.filter(
      (event: any) =>
        !event?.markedForDeletion &&
        String(event?.eventType?.code ?? event?.eventTypeCode ?? '')
          .trim()
          .toUpperCase() === 'OBSERVACION',
    );

    this.observationDrafts = observationEvents.map((event: any) => ({
      ...event,
      eventDate:
        event?.eventDate instanceof Date
          ? event.eventDate
          : parseBackendDate(String(event?.eventDate ?? '')),
      eventTime: String(event?.eventTime ?? '').slice(0, 5),
    }));
  }

  private buildFeedbackDraft(): void {
    this.feedbackResults = (this.results ?? []).filter((item: any) => {
      const code = String(item?.code ?? item?.resultCode ?? '')
        .trim()
        .toUpperCase();

      return (
        code === 'LISTA_ESPERA' ||
        code === 'INGRESO_TRATAMIENTO' ||
        code === 'ABANDONO'
      );
    });

    const feedbackEvents = this.correctionEvents.filter(
      (event: any) =>
        String(event?.eventType?.code ?? event?.eventTypeCode ?? '')
          .trim()
          .toUpperCase() === 'RETROALIMENTACION',
    );

    const feedback =
      feedbackEvents.length > 0
        ? feedbackEvents[feedbackEvents.length - 1]
        : null;

    if (!feedback) {
      this.feedbackDraft = null;
      return;
    }

    const feedbackResultCode = String(
      feedback?.result?.code ?? feedback?.resultCode ?? '',
    )
      .trim()
      .toUpperCase();

    const feedbackResult =
      this.feedbackResults.find(
        (item: any) =>
          String(item?.code ?? item?.resultCode ?? '')
            .trim()
            .toUpperCase() === feedbackResultCode,
      ) ?? null;

    if (feedbackResult) {
      feedback.result = feedbackResult;
      feedback.resultCode = feedbackResult?.code ?? feedbackResultCode;
    }

    if (feedback?.eventDate && !(feedback.eventDate instanceof Date)) {
      feedback.eventDate = parseBackendDate(String(feedback.eventDate));
    }

    this.feedbackDraft = feedback;
  }

  onCorrectionClosureReasonChange(reason: any): void {
    if (!this.closureDraft) {
      return;
    }

    this.closureDraft.closureReason = reason ?? null;
    this.closureDraft.closureReasonCode = reason?.code ?? null;
  }

  private toAdministrativeDate(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    const raw = String(value).trim();

    if (!raw) {
      return null;
    }

    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);

    if (displayMatch) {
      return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
    }

    return null;
  }

  private toAdministrativeTime(value: unknown): any {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return null;
    }

    const match = /^(\d{1,2}):(\d{2})/.exec(raw);

    if (!match) {
      return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return {
      hour,
      minute,
      second: 0,
      nano: 0,
    };
  }

  private toAdministrativeEvent(event: any): any {
    const id = Number(event?.id);

    const action =
      event?.markedForDeletion === true
        ? 'DELETE'
        : event?.temporary === true || id < 0
          ? 'CREATE'
          : 'UPDATE';

    const attendanceStatus =
      event?.attendanceStatus ?? event?.attendanceStatusId ?? null;

    const attendanceStatusId =
      typeof attendanceStatus === 'object'
        ? (attendanceStatus?.id ?? null)
        : (event?.attendanceStatusId ?? null);

    const attendanceStatusCode =
      typeof attendanceStatus === 'object'
        ? (attendanceStatus?.code ?? null)
        : (event?.attendanceStatusCode ?? null);

    return {
      action,
      id: action === 'CREATE' ? null : id || null,
      eventId: action === 'CREATE' ? null : id || null,

      stageId:
        event?.stageId ??
        event?.stage?.id ??
        this.resolveSelectedProgramStageId(),

      relatedEventId: event?.relatedEventId ?? event?.citationId ?? null,

      eventTypeId: event?.eventType?.id ?? event?.eventTypeId ?? null,

      eventTypeCode: event?.eventType?.code ?? event?.eventTypeCode ?? null,

      citationTypeCode:
        event?.citationType?.code ?? event?.citationTypeCode ?? null,

      biopsychosocialCommitmentCode:
        event?.biopsychosocialCommitmentLevel?.code ??
        event?.biopsychosocialCommitmentCode ??
        null,

      eventDate: this.toAdministrativeDate(event?.eventDate),

      eventTime: this.toAdministrativeTime(event?.eventTime),

      attendanceStatusId,
      attendanceStatusCode,

      professionName: event?.professionName ?? null,

      professionalUserId:
        event?.professionalUserId ?? event?.professionalId ?? null,

      programProfessionalId: event?.programProfessionalId ?? null,

      programId:
        event?.program?.id ??
        event?.programId ??
        this.selectedProgramForAdminAction,

      comment: event?.comment ?? null,

      citationComment: event?.citationComment ?? null,

      observation: event?.observation ?? null,

      nextAction: event?.nextAction ?? null,

      nextActionDate: this.toAdministrativeDate(event?.nextActionDate),

      resultCode: event?.result?.code ?? event?.resultCode ?? null,

      stateCode: event?.state?.code ?? event?.stateCode ?? null,
    };
  }

  private buildAdministrativeSubstances(): any[] {
    const original = Array.isArray(this.episodeSubstances)
      ? this.episodeSubstances
      : [];

    const desired: any[] = [];

    const primarySubstanceId = Number(this.correctionDraft?.primarySubstanceId);

    if (primarySubstanceId > 0) {
      const existingPrimary =
        original.find((item: any) => item?.primarySubstance === true) ?? null;

      desired.push({
        existing: existingPrimary,
        substanceId: primarySubstanceId,
        primarySubstance: true,
        useOrder: 1,
        observation: existingPrimary?.observation ?? '',
      });
    }

    const secondary = Array.isArray(this.correctionDraft?.secondarySubstances)
      ? this.correctionDraft.secondarySubstances
      : [];

    secondary.forEach((item: any, index: number) => {
      const existing =
        original.find(
          (current: any) => Number(current?.id) === Number(item?.id),
        ) ?? null;

      desired.push({
        existing,
        substanceId: Number(item?.substanceId),
        primarySubstance: false,
        useOrder: index + 1,
        observation: item?.observation ?? '',
      });
    });

    const payload: any[] = [];

    desired.forEach((item: any) => {
      const existing = item.existing;

      payload.push({
        action: existing ? 'UPDATE' : 'CREATE',
        id: existing?.id ?? null,
        substanceAssociationId: existing?.id ?? null,
        substanceId: item.substanceId,
        level: existing?.level ?? null,
        primarySubstance: item.primarySubstance,
        useOrder: item.useOrder,
        observation: item.observation,
      });
    });

    original.forEach((existing: any) => {
      const stillExists = desired.some(
        (item: any) => Number(item?.existing?.id) === Number(existing?.id),
      );

      if (!stillExists && existing?.id) {
        payload.push({
          action: 'DELETE',
          id: existing.id,
          substanceAssociationId: existing.id,
          substanceId: existing.substanceId ?? null,
        });
      }
    });

    return payload;
  }

  submitAdministrativeCorrection(): void {
    const episodeId = Number(this.episodeId);
    const programId = Number(this.selectedProgramForAdminAction);

    const stageId =
      this.resolveSelectedProgramStageId() ??
      Number(this.closureDraft?.stageId) ??
      null;

    const correctionReason = String(this.correctionReason ?? '').trim();

    if (!episodeId || !programId) {
      this.snackBar.open(
        'No fue posible identificar el episodio o programa.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    if (!stageId) {
      this.snackBar.open(
        'No fue posible identificar de forma segura la etapa del programa seleccionado.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    if (!correctionReason) {
      this.snackBar.open(
        'Debe indicar el motivo de la corrección administrativa.',
        'Cerrar',
        {
          duration: 5000,
        },
      );
      return;
    }

    const originalEvents = Array.isArray(this.longitudinal?.events)
      ? this.longitudinal.events
      : [];

    const { citations, attendances } =
      buildAdministrativeCitationAttendanceCorrections(
        this.correctionEvents,
        originalEvents,
        (event: any) => this.toAdministrativeEvent(event),
      );

    const feedbacks = buildAdministrativeFeedbackCorrections(
      this.correctionEvents,
      originalEvents,
      (event: any) => this.toAdministrativeEvent(event),
    );
    syncAdministrativeObservationDrafts(
      this.correctionEvents,
      this.observationDrafts,
    );

    const observations = buildAdministrativeObservationCorrections(
      this.correctionEvents,
      originalEvents,
      stageId,
    );

    const closureReasonId = this.closureDraft?.closureReason?.id ?? null;

    const closureReasonCode =
      this.closureDraft?.closureReason?.code ??
      this.closureDraft?.closureReasonCode ??
      null;

    const closureDate = this.toAdministrativeDate(
      this.closureDraft?.closureDate,
    );

    const stageWasClosed = !!closureDate;

    const originalStage =
      Array.isArray(this.longitudinal?.stages)
        ? this.longitudinal.stages.find(
            (stage: any) =>
              Number(stage?.id ?? stage?.stageId) === Number(stageId),
          )
        : null;

    const originalClosureDate = this.toAdministrativeDate(
      originalStage?.closedAt ?? null,
    );

    const originalClosureReasonCode = String(
      originalStage?.closureReason?.code ??
        originalStage?.closureReasonCode ??
        originalStage?.resultCode ??
        '',
    )
      .trim()
      .toUpperCase();

    const correctedClosureReasonCode = String(
      closureReasonCode ?? '',
    )
      .trim()
      .toUpperCase();

    const originalClosureComment = String(
      originalStage?.closureComment ?? '',
    ).trim();

    const correctedClosureComment = String(
      this.closureDraft?.closureComment ?? '',
    ).trim();

    const closureChanged =
      closureDate !== originalClosureDate ||
      correctedClosureReasonCode !== originalClosureReasonCode ||
      correctedClosureComment !== originalClosureComment;

    const originalEpisodeTypeId =
      this.episode?.episodeType?.id ?? this.episode?.episodeTypeId ?? null;

    const correctedEpisodeTypeId = this.correctionDraft?.episodeTypeId ?? null;

    const episodeTypeChanged = correctedEpisodeTypeId !== originalEpisodeTypeId;

    const originalRequestDate = this.toAdministrativeDate(
      this.episode?.originalRequestDate ?? this.episode?.requestDate ?? null,
    );

    const correctedOriginalRequestDate = this.toAdministrativeDate(
      this.correctionDraft?.originalRequestDate,
    );

    const originalRequestDateChanged =
      correctedOriginalRequestDate !== null &&
      correctedOriginalRequestDate !== originalRequestDate;

    const originalContactTypeId =
      this.episode?.contactType?.id ?? this.episode?.contactTypeId ?? null;

    const correctedContactTypeId = this.correctionDraft?.contactTypeId ?? null;

    const contactTypeChanged = correctedContactTypeId !== originalContactTypeId;

    const originalSenderId =
      this.episode?.sender?.id ?? this.episode?.senderId ?? null;

    const correctedSenderId = this.correctionDraft?.senderId ?? null;

    const senderChanged = correctedSenderId !== originalSenderId;

    const originalDiverterId =
      this.episode?.diverter?.id ?? this.episode?.diverterId ?? null;

    const correctedDiverterId = this.correctionDraft?.diverterId ?? null;

    const diverterChanged = correctedDiverterId !== originalDiverterId;

    const originalPreviousTreatmentNumber =
      this.episode?.previousTreatmentNumber ?? null;

    const correctedPreviousTreatmentNumber =
      this.correctionDraft?.previousTreatmentNumber ?? null;

    const previousTreatmentNumberChanged =
      correctedPreviousTreatmentNumber !== originalPreviousTreatmentNumber;

    const originalProgramReceivedAt = this.toAdministrativeDate(
      this.correctionDraft?.originalProgramReceivedAt,
    );

    const correctedProgramReceivedAt = this.toAdministrativeDate(
      this.correctionDraft?.programReceivedAt,
    );

    const programReceivedAtChanged =
      correctedProgramReceivedAt !== null &&
      correctedProgramReceivedAt !== originalProgramReceivedAt;
    const originalReferences = Array.isArray(this.longitudinal?.references)
      ? this.longitudinal.references
      : [];

    const references = this.referenceDrafts
      .filter((reference: any) => Number(reference?.id) > 0)
      .map((reference: any) => {
        const original = originalReferences.find(
          (item: any) => Number(item?.id) === Number(reference?.id),
        );

        if (!original) {
          return null;
        }

        const correctedReferenceDate = this.toAdministrativeDate(
          reference?.referenceDate,
        );

        const originalReferenceDate = original?.referenceDate
          ? String(original.referenceDate).slice(0, 10)
          : null;

        const correctedReason = String(reference?.reason ?? '').trim();
        const originalReason = String(original?.reason ?? '').trim();

        const correctedObservation = String(
          reference?.observation ?? '',
        ).trim();

        const originalObservation = String(
          original?.observation ?? '',
        ).trim();

        const changed =
          correctedReferenceDate !== originalReferenceDate ||
          correctedReason !== originalReason ||
          correctedObservation !== originalObservation;

        if (!changed) {
          return null;
        }

        return {
          action: 'UPDATE',
          id: Number(reference.id),
          referenceId: Number(reference.id),
          originStageId: Number(reference.originStageId),
          destinationStageId: Number(reference.destinationStageId),
          destinationProgramId: Number(
            reference?.destinationProgram?.id ??
              reference?.destinationProgramId ??
              0,
          ),
          referenceDate: correctedReferenceDate,
          reason: correctedReason || null,
          observation: correctedObservation || null,
          makeDestinationCurrent: false,
        };
      })
      .filter((reference: any) => reference !== null);

    const payload: any = {
      programId,
      stageId,
      correctionReason,
      observations,
    };

    if (
      episodeTypeChanged ||
      originalRequestDateChanged ||
      contactTypeChanged ||
      senderChanged ||
      diverterChanged ||
      previousTreatmentNumberChanged
    ) {
      payload.episode = {};

      if (episodeTypeChanged) {
        payload.episode.episodeTypeId = correctedEpisodeTypeId;
      }

      if (originalRequestDateChanged) {
        payload.episode.originalRequestDate = correctedOriginalRequestDate;
      }

      if (contactTypeChanged) {
        payload.episode.contactTypeId = correctedContactTypeId;
      }

      if (senderChanged) {
        payload.episode.senderId = correctedSenderId;
      }

      if (diverterChanged) {
        payload.episode.diverterId = correctedDiverterId;
      }

      if (previousTreatmentNumberChanged) {
        payload.episode.previousTreatmentNumber =
          correctedPreviousTreatmentNumber;
      }
    }
    if (references.length > 0) {
      payload.references = references;
    }

    if (citations.length > 0) {
      payload.citations = citations;
    }

    if (attendances.length > 0) {
      payload.attendances = attendances;
    }
    if (feedbacks.length > 0) {
      payload.feedbacks = feedbacks;
    }
    if (closureChanged) {
      payload.closure = {
        stageId,
        closureReasonId,
        closureReasonCode,
        closureDate,
        closedAt: stageWasClosed ? closureDate : null,
        closureComment:
          stageWasClosed ? correctedClosureComment || null : null,
        stateCode:
          stageWasClosed
            ? this.correctionDraft?.stateCode ?? null
            : 'EN_TRAMITE',
        resultCode:
          stageWasClosed
            ? this.correctionDraft?.resultCode ?? null
            : 'AUN_SIN_RESULTADO',
        closed: stageWasClosed,
        closeEpisode: false,
      };
    }
    if (closureChanged) {
      payload.closure = {
        stageId,
        closureReasonId,
        closureReasonCode,
        closureDate,
        closedAt: stageWasClosed ? closureDate : null,
        closureComment:
          stageWasClosed ? correctedClosureComment || null : null,
        stateCode:
          stageWasClosed
            ? this.correctionDraft?.stateCode ?? null
            : 'EN_TRAMITE',
        resultCode:
          stageWasClosed
            ? this.correctionDraft?.resultCode ?? null
            : 'AUN_SIN_RESULTADO',
        closed: stageWasClosed,
        closeEpisode: false,
      };
    }
    console.log('[EpisodePurge] Administrative correction payload:', payload);

    this.correcting = true;

    this.demandService
      .administrativeCorrection(episodeId, payload)
      .pipe(
        finalize(() => {
          this.correcting = false;
        }),
      )
      .subscribe({
        next: (response) => {
          console.log(
            '[EpisodePurge] Administrative correction response:',
            response,
          );

          if (
            programReceivedAtChanged &&
            correctedProgramReceivedAt &&
            stageId
          ) {
            this.demandService
              .correctProgramReceivedAt(episodeId, programId, {
                stageId,
                receivedAt: correctedProgramReceivedAt,
                correctionReason,
              })
              .subscribe({
                next: (receivedAtResponse) => {
                  console.log(
                    '[EpisodePurge] Program receivedAt correction response:',
                    receivedAtResponse,
                  );

                  this.snackBar.open(
                    'Corrección administrativa y fecha de ingreso al programa aplicadas correctamente.',
                    'Cerrar',
                    {
                      duration: 5000,
                    },
                  );

                  this.searchEpisode();
                },
                error: (error) => {
                  console.error(
                    '[EpisodePurge] Error corrigiendo fecha de ingreso al programa:',
                    error,
                  );

                  this.snackBar.open(
                    'La corrección administrativa fue aplicada, pero falló la corrección de la fecha de ingreso al programa.',
                    'Cerrar',
                    {
                      duration: 7000,
                    },
                  );

                  this.searchEpisode();
                },
              });

            return;
          }

          this.snackBar.open(
            'Corrección administrativa aplicada correctamente.',
            'Cerrar',
            {
              duration: 5000,
            },
          );

          this.correctionReason = '';

          this.searchEpisode();
        },

        error: (error) => {
          console.error(
            '[EpisodePurge] Error aplicando corrección administrativa:',
            error,
          );

          const message =
            error?.error?.message ??
            error?.error?.error ??
            'No fue posible aplicar la corrección administrativa.';

          this.snackBar.open(String(message), 'Cerrar', {
            duration: 7000,
          });
        },
      });
  }
  private buildClosureDraft(): void {
    const episodeId = Number(this.episodeId);
    const programId = Number(this.selectedProgramForAdminAction);

    if (!episodeId || !programId) {
      this.closureDraft = null;
      return;
    }

    const selectedStages = Array.isArray(this.longitudinal?.stages)
      ? this.longitudinal.stages.filter(
          (stage: any) =>
            Number(stage?.program?.id ?? stage?.programId ?? 0) === programId,
        )
      : [];

    const stage = selectedStages.length === 1 ? selectedStages[0] : null;

    const closureEvents = this.correctionEvents.filter(
      (event: any) =>
        String(event?.eventType?.code ?? event?.eventTypeCode ?? '')
          .trim()
          .toUpperCase() === 'CIERRE',
    );

    const closureEvent =
      closureEvents.length > 0 ? closureEvents[closureEvents.length - 1] : null;

    if (!stage && !closureEvent) {
      this.closureDraft = null;
      return;
    }

    const closureReasonCode = String(
      stage?.closureReason?.code ??
        stage?.closureReasonCode ??
        stage?.resultCode ??
        closureEvent?.resultCode ??
        '',
    )
      .trim()
      .toUpperCase();

    const closureReason =
      this.closureReasons.find(
        (item: any) =>
          String(item?.code ?? item?.resultCode ?? '')
            .trim()
            .toUpperCase() === closureReasonCode,
      ) ?? null;

    const closedAt = stage?.closedAt ?? null;

    this.closureDraft = {
      stageId: stage?.id ?? stage?.stageId ?? closureEvent?.stageId ?? null,

      closureReason,
      closureReasonCode: closureReason?.code ?? closureReasonCode ?? null,

      closureDate: closedAt
        ? parseBackendDate(String(closedAt).slice(0, 10))
        : null,

      closureComment:
        stage?.closureComment ?? this.episode?.closureComment ?? '',
    };
  }

  private buildCitationRows(): void {
    const citationEvents = this.correctionEvents.filter(
      (event: any) =>
        String(event?.eventType?.code ?? event?.eventTypeCode ?? '')
          .trim()
          .toUpperCase() === 'CITACION',
    );

    const attendanceEvents = this.correctionEvents.filter(
      (event: any) =>
        String(event?.eventType?.code ?? event?.eventTypeCode ?? '')
          .trim()
          .toUpperCase() === 'ASISTENCIA',
    );

    const definitions = [
      {
        code: DEMAND_CITATION_CODES.firstCitationFirstInterview,
        interview: 1,
        citationNumber: 1,
        label: 'C1-E1',
        title: 'Primera citación a primera entrevista',
      },
      {
        code: DEMAND_CITATION_CODES.secondCitationFirstInterview,
        interview: 1,
        citationNumber: 2,
        label: 'C2-E1',
        title: 'Segunda citación a primera entrevista',
      },
      {
        code: DEMAND_CITATION_CODES.firstCitationSecondInterview,
        interview: 2,
        citationNumber: 1,
        label: 'C1-E2',
        title: 'Primera citación a segunda entrevista',
      },
      {
        code: DEMAND_CITATION_CODES.secondCitationSecondInterview,
        interview: 2,
        citationNumber: 2,
        label: 'C2-E2',
        title: 'Segunda citación a segunda entrevista',
      },
      {
        code: DEMAND_CITATION_CODES.firstCitationThirdInterview,
        interview: 3,
        citationNumber: 1,
        label: 'C1-E3',
        title: 'Primera citación a tercera entrevista',
      },
      {
        code: DEMAND_CITATION_CODES.secondCitationThirdInterview,
        interview: 3,
        citationNumber: 2,
        label: 'C2-E3',
        title: 'Segunda citación a tercera entrevista',
      },
      {
        code: DEMAND_CITATION_CODES.optionalInterview,
        interview: null,
        citationNumber: 1,
        label: 'Opc.',
        title: 'Entrevista opcional',
      },
    ];

    this.citationRows = definitions.map((definition) => {
      const citations = citationEvents.filter((citation: any) => {
        const code = resolveCitationTypeCode(
          citation,
          citationEvents,
          this.citationTypes,
        );

        return code === definition.code;
      });

      const attempts = citations.map((citation: any) => {
        if (citation?.eventDate && !(citation.eventDate instanceof Date)) {
          citation.eventDate = parseBackendDate(String(citation.eventDate));
        }

        const citationId = Number(citation?.id);

        const attendance =
          attendanceEvents.find((event: any) => {
            const relatedEventId = Number(
              event?.relatedEventId ??
                event?.relatedEvent?.id ??
                event?.citationEventId ??
                0,
            );

            return citationId !== 0 && relatedEventId === citationId;
          }) ?? null;

        return {
          citation,
          attendance,
        };
      });

      return {
        ...definition,
        attempts,
      };
    });
  }

  private loadProfessionalsForSelectedProgram(): void {
    const selectedProgramId = Number(this.selectedProgramForAdminAction);

    this.professionals = [];
    this.professionalsError = '';

    if (!selectedProgramId) {
      return;
    }

    this.isLoadingProfessionals = true;

    this.programProfessionalService
      .getActive()
      .pipe(finalize(() => (this.isLoadingProfessionals = false)))
      .subscribe({
        next: (response: any) => {
          const items = Array.isArray(response)
            ? response
            : Array.isArray(response?.content)
              ? response.content
              : Array.isArray(response?.data)
                ? response.data
                : [];

          this.professionals = items
            .map((item: any) => normalizeProfessionalForCitation(item))
            .filter((item: any) => {
              const isActive =
                !!item?.id && !item?.deletedAt && item?.active !== false;

              const belongsToSelectedProgram =
                Array.isArray(item?.programIds) &&
                item.programIds.some(
                  (programId: number) =>
                    Number(programId) === selectedProgramId,
                );

              return isActive && belongsToSelectedProgram;
            });

          if (!this.professionals.length) {
            this.professionalsError =
              'No hay facultativos activos asociados al programa seleccionado.';
          }
        },

        error: (error) => {
          console.error('[EpisodePurge] Error cargando facultativos:', error);

          this.professionals = [];
          this.professionalsError =
            'No fue posible cargar los facultativos del programa seleccionado.';
        },
      });
  }

  onAdminProgramSelected(programId: number): void {
    const normalizedProgramId = Number(programId);

    if (!normalizedProgramId) {
      this.selectedProgramForAdminAction = null;
      this.correctionDraft = null;
      this.correctionEvents = [];
      return;
    }

    this.selectedProgramForAdminAction = normalizedProgramId;

    this.loadProfessionalsForSelectedProgram();

    if (this.adminMode === 'correction') {
      this.startCorrection();
      return;
    }

    if (this.adminMode === 'reversal') {
      return;
    }
  }

  startCorrection(): void {
    if (!this.episode) {
      return;
    }

    const selectedProgramId = Number(this.selectedProgramForAdminAction);

    if (!selectedProgramId) {
      this.correctionDraft = null;
      this.correctionEvents = [];
      return;
    }

    this.adminMode = 'correction';

    console.log('[EpisodePurge] Cronología disponible:', {
      longitudinalKeys: Object.keys(this.longitudinal ?? {}),
      episodeKeys: Object.keys(this.episode ?? {}),
      stages: Array.isArray(this.longitudinal?.stages)
        ? this.longitudinal.stages.map((stage: any) => ({
            stageId: stage?.id ?? stage?.stageId ?? null,
            program: stage?.program?.name ?? stage?.programName ?? null,
            keys: Object.keys(stage ?? {}),
          }))
        : [],
    });

    this.loadCorrectionCatalogs();
    this.loadCorrectionSubstances();

    const selectedStageId = this.resolveSelectedProgramStageId();

    const selectedProgramStage = Array.isArray(this.longitudinal?.stages)
      ? (this.longitudinal.stages.find(
          (stage: any) =>
            Number(stage?.id ?? stage?.stageId ?? 0) ===
            Number(selectedStageId),
        ) ?? null)
      : null;

    this.correctionDraft = {
      episodeId: this.episodeId,
      episodeCode: this.episodeCode,

      initialProgramId:
        this.episode?.initialProgram?.id ??
        this.episode?.initialProgramId ??
        null,

      initialProgramName:
        this.episode?.initialProgram?.name ??
        this.episode?.initialProgramName ??
        '',

      originalRequestDate: parseBackendDate(
        this.episode?.originalRequestDate ?? this.episode?.requestDate ?? null,
      ),

      programReceivedAt: parseBackendDate(
        selectedProgramStage?.receivedAt ?? null,
      ),

      originalProgramReceivedAt: selectedProgramStage?.receivedAt ?? null,

      episodeTypeId:
        this.episode?.episodeType?.id ?? this.episode?.episodeTypeId ?? null,

      previousTreatmentNumber: this.episode?.previousTreatmentNumber ?? null,

      primarySubstanceId: null,
      secondarySubstances: [],

      contactTypeId:
        this.episode?.contactType?.id ?? this.episode?.contactTypeId ?? null,

      senderId: this.episode?.sender?.id ?? this.episode?.senderId ?? null,

      diverterId:
        this.episode?.diverter?.id ?? this.episode?.diverterId ?? null,

      stateCode: this.episode?.state?.code ?? this.episode?.stateCode ?? null,

      resultCode:
        this.episode?.result?.code ?? this.episode?.resultCode ?? null,
    };

    console.log('[EpisodePurge] fecha correctionDraft', {
      episodeOriginalRequestDate: this.episode?.originalRequestDate,
      episodeRequestDate: this.episode?.requestDate,
      correctionOriginalRequestDate: this.correctionDraft?.originalRequestDate,
      isDate: this.correctionDraft?.originalRequestDate instanceof Date,
    });

    const selectedEpisodeId = Number(this.episodeId);

    const sourceReferences = Array.isArray(this.longitudinal?.references)
      ? this.longitudinal.references.filter(
          (reference: any) =>
            Number(reference?.episodeId) === selectedEpisodeId &&
            Number(reference?.originStageId) === Number(selectedStageId),
        )
      : [];

    this.referenceDrafts = JSON.parse(
      JSON.stringify(sourceReferences),
    ).map((reference: any) => ({
      ...reference,
      referenceDate: reference?.referenceDate
        ? parseBackendDate(String(reference.referenceDate).slice(0, 10))
        : null,
    }));

    const sourceEvents = Array.isArray(this.longitudinal?.events)
      ? this.longitudinal.events.filter(
          (event: any) =>
            Number(event?.episodeId) === selectedEpisodeId &&
            Number(event?.program?.id ?? event?.programId ?? 0) ===
              selectedProgramId,
        )
      : [];

    this.correctionEvents = JSON.parse(JSON.stringify(sourceEvents)).sort(
      (left: any, right: any) => {
        const leftDateTime =
          String(left?.eventDate ?? '') +
          'T' +
          String(left?.eventTime ?? '00:00:00');

        const rightDateTime =
          String(right?.eventDate ?? '') +
          'T' +
          String(right?.eventTime ?? '00:00:00');

        const dateComparison = leftDateTime.localeCompare(rightDateTime);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return String(left?.createdAt ?? '').localeCompare(
          String(right?.createdAt ?? ''),
        );
      },
    );

    this.correctionEvents.forEach((event: any) => {
      if (event?.eventTime) {
        event.eventTime = String(event.eventTime).slice(0, 5);
      }
    });

    this.buildCitationRows();
    this.buildObservationDrafts();
    this.buildFeedbackDraft();
    this.buildClosureDraft();
  }

  onEpisodeIdChange(): void {
    this.longitudinal = null;
    this.adminMode = null;
    this.correctionDraft = null;
    this.correctionEvents = [];
    this.episode = null;
    this.purgeResult = null;
    this.confirmationCode = '';
    this.errorMessage = '';
    this.directPurgeAvailable = false;
  }

  searchEpisode(): void {
    const episodeId = this.episodeId;

    if (!episodeId) {
      this.errorMessage = 'Ingrese un ID de episodio válido.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.directPurgeAvailable = false;
    this.longitudinal = null;
    this.episode = null;
    this.purgeResult = null;
    this.confirmationCode = '';

    this.demandService
      .getEpisodeLongitudinal(episodeId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const episodes = Array.isArray(response?.episodes)
            ? response.episodes
            : [];

          const requestedEpisode = episodes.find(
            (item: any) =>
              Number(item?.id ?? item?.episodeId ?? 0) === episodeId,
          );

          const episode =
            response?.episode ??
            requestedEpisode ??
            response?.activeEpisode ??
            (Number(response?.id ?? response?.episodeId ?? 0) === episodeId
              ? response
              : null);

          if (!episode) {
            this.errorMessage =
              'La respuesta no contiene el episodio solicitado.';
            return;
          }

          this.longitudinal = response;
          this.episode = episode;
          this.loadEpisodePrograms();

          if (
            this.adminMode === 'correction' &&
            this.selectedProgramForAdminAction
          ) {
            this.startCorrection();
          }

          const selectedEpisodeEvents = Array.isArray(response?.events)
            ? response.events.filter(
                (event: any) => Number(event?.episodeId) === Number(episodeId),
              )
            : [];

          console.log(
            '[EpisodePurge] CIERRE seleccionado:',
            selectedEpisodeEvents.find(
              (event: any) =>
                String(event?.eventType?.code ?? '')
                  .trim()
                  .toUpperCase() === 'CIERRE',
            ),
          );

          const selectedFeedback = selectedEpisodeEvents.find(
            (event: any) =>
              String(event?.eventType?.code ?? '')
                .trim()
                .toUpperCase() === 'RETROALIMENTACION',
          );

          console.log(
            '[EpisodePurge] RETROALIMENTACION JSON:',
            JSON.stringify(selectedFeedback, null, 2),
          );

          console.log('[EpisodePurge] RETROALIMENTACION hora:', {
            id: selectedFeedback?.id,
            eventDate: selectedFeedback?.eventDate,
            eventTime: selectedFeedback?.eventTime,
            createdAt: selectedFeedback?.createdAt,
          });

          if (Array.isArray(response?.events)) {
            response.events.slice(0, 3).forEach((event: any, index: number) => {
              console.log(
                '[EpisodePurge] EVENTO ' + (index + 1) + ':',
                JSON.stringify(event, null, 2),
              );
            });
          }

          console.log(
            '[EpisodePurge] Eventos JSON:',
            JSON.stringify(
              Array.isArray(response?.events)
                ? response.events.slice(0, 3)
                : [],
              null,
              2,
            ),
          );

          console.log(
            '[EpisodePurge] Muestra eventos:',
            Array.isArray(response?.events)
              ? response.events.slice(0, 12).map((event: any) => ({
                  keys: Object.keys(event ?? {}),
                  event,
                }))
              : [],
          );

          console.log(
            '[EpisodePurge] Claves longitudinal:',
            Object.keys(response ?? {}),
          );

          console.log(
            '[EpisodePurge] Claves episodio:',
            Object.keys(episode ?? {}),
          );

          console.log(
            '[EpisodePurge] Claves etapas:',
            Array.isArray(response?.stages)
              ? response.stages.map((stage: any) => ({
                  stageId: stage?.id ?? stage?.stageId ?? null,
                  keys: Object.keys(stage ?? {}),
                }))
              : [],
          );

          console.log('[EpisodePurge] Estructura cronológica:', {
            events: response?.events ?? response?.episodeEvents ?? null,

            stages: Array.isArray(response?.stages)
              ? response.stages.map((stage: any) => ({
                  id: stage?.id ?? stage?.stageId ?? null,
                  program: stage?.program?.name ?? stage?.programName ?? null,
                  receivedAt: stage?.receivedAt ?? null,
                  closedAt: stage?.closedAt ?? null,
                  events: stage?.events ?? stage?.episodeEvents ?? null,
                }))
              : [],

            episodeEvents: episode?.events ?? episode?.episodeEvents ?? null,
          });

          console.log('[EpisodePurge] Datos episodio seleccionado:', {
            id: episode?.id ?? episode?.episodeId ?? null,
            episodeCode: episode?.episodeCode ?? episode?.code ?? null,

            originalRequestDate:
              episode?.originalRequestDate ?? episode?.requestDate ?? null,

            initialProgram: episode?.initialProgram ?? null,

            initialProgramId:
              episode?.initialProgramId ?? episode?.initialProgram?.id ?? null,

            initialProgramName:
              episode?.initialProgramName ??
              episode?.initialProgram?.name ??
              null,

            currentProgram: episode?.currentProgram ?? null,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.directPurgeAvailable = error.status !== 404;

          this.errorMessage =
            error.status === 404
              ? 'No existe un episodio con ese ID.'
              : this.resolveErrorMessage(
                  error,
                  'No fue posible consultar el episodio.',
                );
        },
      });
  }

  reverseEpisode(): void {
    const episodeId = this.episodeId;
    const programId = Number(this.selectedProgramForAdminAction);
    const reason = String(this.reversalReason ?? '').trim();
    const observation = String(this.reversalObservation ?? '').trim();

    if (!episodeId || !this.episode) {
      this.errorMessage = 'No hay un episodio válido para reversar.';
      return;
    }

    if (!programId) {
      this.errorMessage = 'Seleccione el programa que desea intervenir.';
      return;
    }

    if (!reason) {
      this.errorMessage = 'Ingrese el motivo de la reversión.';
      return;
    }

    this.reversing = true;
    this.errorMessage = '';

    this.demandService
      .reverseEpisode(episodeId, {
        reason,
        observation: observation || undefined,
      })
      .pipe(finalize(() => (this.reversing = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Reversión realizada correctamente.', 'Cerrar', {
            duration: 5000,
          });

          this.reversalReason = '';
          this.reversalObservation = '';

          this.searchEpisode();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible reversar el episodio.',
          );
        },
      });
  }
  purgeEpisode(): void {
    const episodeId = this.episodeId;

    if (!episodeId || !this.deletionConfirmed) {
      return;
    }

    this.purging = true;
    this.errorMessage = '';
    this.purgeResult = null;

    this.demandService
      .purgeEpisode(episodeId)
      .pipe(finalize(() => (this.purging = false)))
      .subscribe({
        next: (response) => {
          this.purgeResult = response;
          this.longitudinal = null;
          this.episode = null;
          this.confirmationCode = '';

          this.snackBar.open(
            `Episodio ${response.episodeCode} eliminado correctamente.`,
            'Cerrar',
            { duration: 5000 },
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible eliminar el episodio.',
          );
        },
      });
  }

  private resolveErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    const backendMessage =
      error?.error?.message ??
      error?.error?.error ??
      (typeof error?.error === 'string' ? error.error : '');

    return String(backendMessage || fallback);
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .trim()
      .toUpperCase();
  }
}
