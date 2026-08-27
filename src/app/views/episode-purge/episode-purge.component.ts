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
import { DemandNewDateAdapter, DEMAND_NEW_DATE_FORMATS } from '../demand-new/utils/demand-new-date-adapter';
import { parseBackendDate } from '../demand-new/utils/demand-new-format.utils';

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
  private readonly programProfessionalService = inject(ProgramProfessionalService);
  private readonly snackBar = inject(MatSnackBar);

  episodeIdInput: number | null = null;
  confirmationCode = '';

  longitudinal: any = null;
  episode: any = null;
  purgeResult: PurgeEpisodeResponse | null = null;

  loading = false;
  purging = false;
  errorMessage = '';

  adminMode: 'correction' | 'reversal' | 'purge' | null = null;
  selectedProgramForAdminAction: number | null = null;
  episodePrograms: any[] = [];
  professionals: any[] = [];
  isLoadingProfessionals = false;
  professionalsError = '';
  citationRows: any[] = [];
  feedbackDraft: any = null;
  closureDraft: any = null;
  feedbackResults: any[] = [];
  private nextTemporaryEventId = -1;
  correctionDraft: any = null;
  correctionEvents: any[] = [];
  episodeSubstances: any[] = [];
  selectedSecondarySubstanceId: number | null = null;

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

    const displayMatch =
      /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);

    if (displayMatch) {
      target[field] =
        displayMatch[3] +
        '-' +
        displayMatch[2] +
        '-' +
        displayMatch[1];

      return;
    }

    const isoMatch =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

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

    return [
      person.firstName,
      person.firstLastName ?? person.lastName,
      person.secondLastName,
    ]
      .filter(Boolean)
      .join(' ') || 'Persona no informada';
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
      !!this.episode &&
      !!expected &&
      entered === expected &&
      !this.loading &&
      !this.purging
    );
  }

  get deletedRows(): Array<[string, number]> {
    return Object.entries(
      this.purgeResult?.deletedRows ?? {},
    );
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

    this.demandService
      .getEpisodeSubstances(episodeId)
      .subscribe({
        next: (items) => {
          this.episodeSubstances = Array.isArray(items)
            ? items
            : [];

          const primarySubstance =
            this.episodeSubstances.find(
              (item: any) => item?.primarySubstance === true,
            ) ?? null;

          const secondarySubstances =
            this.episodeSubstances
              .filter(
                (item: any) => item?.primarySubstance !== true,
              )
              .sort(
                (left: any, right: any) =>
                  Number(left?.useOrder ?? 0) -
                  Number(right?.useOrder ?? 0),
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

            this.correctionDraft.secondarySubstances =
              secondarySubstances;
          }

          console.log(
            '[EpisodePurge] Sustancias del episodio:',
            this.episodeSubstances,
          );
        },
        error: (error) => {
          console.error(
            '[EpisodePurge] Error cargando sustancias:',
            error,
          );

          this.episodeSubstances = [];
        },
      });
  }

  addSecondarySubstance(): void {
    const substanceId = Number(this.selectedSecondarySubstanceId);

    if (
      !this.correctionDraft ||
      !Number.isFinite(substanceId) ||
      substanceId <= 0
    ) {
      return;
    }

    if (
      Number(this.correctionDraft.primarySubstanceId) === substanceId
    ) {
      return;
    }

    const current = Array.isArray(
      this.correctionDraft.secondarySubstances,
    )
      ? this.correctionDraft.secondarySubstances
      : [];

    const alreadyExists = current.some(
      (item: any) =>
        Number(item?.substanceId) === substanceId,
    );

    if (alreadyExists) {
      return;
    }

    const catalogItem = this.substances.find(
      (item: any) =>
        Number(item?.id) === substanceId,
    );

    this.correctionDraft.secondarySubstances = [
      ...current,
      {
        id: null,
        substanceId,
        substanceName: catalogItem?.name ?? '',
        useOrder: current.length + 1,
        observation: '',
      },
    ];

    this.selectedSecondarySubstanceId = null;
  }

  removeSecondarySubstance(index: number): void {
    if (
      !this.correctionDraft ||
      !Array.isArray(this.correctionDraft.secondarySubstances)
    ) {
      return;
    }

    this.correctionDraft.secondarySubstances =
      this.correctionDraft.secondarySubstances
        .filter((_: any, itemIndex: number) => itemIndex !== index)
        .map((item: any, itemIndex: number) => ({
          ...item,
          useOrder: itemIndex + 1,
        }));
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

    if (
      Number.isFinite(leftId) &&
      Number.isFinite(rightId)
    ) {
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
            !stage?.episodeId ||
            Number(stage?.episodeId) === selectedEpisodeId,
        )
      : [];

    const uniquePrograms = new Map<number, any>();

    stages.forEach((stage: any) => {
      const programId = Number(
        stage?.program?.id ??
        stage?.programId ??
        0
      );

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

  selectAdminAction(
    mode: 'correction' | 'reversal' | 'purge',
  ): void {
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
      (item: any) =>
        Number(item?.id) === normalizedProfessionalId,
    );

    citation.programProfessionalId =
      normalizedProfessionalId || null;

    citation.programProfessionalName =
      professional?.name ?? null;

    citation.professionName =
      professional?.professionName ?? null;
  }

  private resolveSelectedProgramStageId(): number | null {
    const stageIds = Array.from(
      new Set(
        this.correctionEvents
          .map((event: any) =>
            Number(
              event?.stageId ??
              event?.stage?.id ??
              0,
            ),
          )
          .filter((stageId: number) => stageId > 0),
      ),
    );

    if (stageIds.length !== 1) {
      return null;
    }

    return stageIds[0];
  }

  addCorrectionCitation(row: any): void {
    if (!row?.code) {
      return;
    }

    const episodeId = Number(this.episodeId);
    const programId = Number(
      this.selectedProgramForAdminAction,
    );
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
      this.citationTypes.find(
        (item: any) => item?.code === row.code,
      ) ?? null;

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

    if (
      !citationId ||
      !episodeId ||
      !stageId ||
      !programId
    ) {
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

      programProfessionalId:
        citation?.programProfessionalId ?? null,

      programProfessionalName:
        citation?.programProfessionalName ?? null,

      professionName:
        citation?.professionName ?? null,

      comment: '',
      observation: null,
    };

    this.correctionEvents.push(attendance);
    this.buildCitationRows();
  }

  addCorrectionFeedback(): void {
    const episodeId = Number(this.episodeId);
    const programId = Number(
      this.selectedProgramForAdminAction,
    );
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

  onCorrectionFeedbackProfessionalChange(
    professionalId: number,
  ): void {
    if (!this.feedbackDraft) {
      return;
    }

    const normalizedProfessionalId = Number(professionalId);

    const professional = this.professionals.find(
      (item: any) =>
        Number(item?.id) === normalizedProfessionalId,
    );

    this.feedbackDraft.programProfessionalId =
      normalizedProfessionalId || null;

    this.feedbackDraft.programProfessionalName =
      professional?.name ?? null;

    this.feedbackDraft.professionName =
      professional?.professionName ?? null;
  }

  onCorrectionFeedbackResultChange(result: any): void {
    if (!this.feedbackDraft) {
      return;
    }

    this.feedbackDraft.result = result ?? null;
    this.feedbackDraft.resultCode =
      result?.code ?? null;
  }

  onCorrectionFeedbackCommitmentChange(level: any): void {
    if (!this.feedbackDraft) {
      return;
    }

    this.feedbackDraft.biopsychosocialCommitmentLevel =
      level ?? null;

    this.feedbackDraft.biopsychosocialCommitmentCode =
      level?.code ?? null;
  }

  private buildFeedbackDraft(): void {
    this.feedbackResults = (this.results ?? []).filter(
      (item: any) => {
        const code = String(
          item?.code ??
          item?.resultCode ??
          '',
        )
          .trim()
          .toUpperCase();

        return (
          code === 'LISTA_ESPERA' ||
          code === 'INGRESO_TRATAMIENTO' ||
          code === 'ABANDONO'
        );
      },
    );

    const feedbackEvents = this.correctionEvents.filter(
      (event: any) =>
        String(
          event?.eventType?.code ??
          event?.eventTypeCode ??
          '',
        )
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
      feedback?.result?.code ??
      feedback?.resultCode ??
      '',
    )
      .trim()
      .toUpperCase();

    const feedbackResult =
      this.feedbackResults.find(
        (item: any) =>
          String(
            item?.code ??
            item?.resultCode ??
            '',
          )
            .trim()
            .toUpperCase() === feedbackResultCode,
      ) ?? null;

    if (feedbackResult) {
      feedback.result = feedbackResult;
      feedback.resultCode =
        feedbackResult?.code ??
        feedbackResultCode;
    }

    if (
      feedback?.eventDate &&
      !(feedback.eventDate instanceof Date)
    ) {
      feedback.eventDate =
        parseBackendDate(String(feedback.eventDate));
    }

    this.feedbackDraft = feedback;
  }

  onCorrectionClosureReasonChange(reason: any): void {
    if (!this.closureDraft) {
      return;
    }

    this.closureDraft.closureReason = reason ?? null;
    this.closureDraft.closureReasonCode =
      reason?.code ??
      null;
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
            Number(
              stage?.program?.id ??
              stage?.programId ??
              0,
            ) === programId,
        )
      : [];

    const stage =
      selectedStages.length === 1
        ? selectedStages[0]
        : null;

    const closureEvents = this.correctionEvents.filter(
      (event: any) =>
        String(
          event?.eventType?.code ??
          event?.eventTypeCode ??
          '',
        )
          .trim()
          .toUpperCase() === 'CIERRE',
    );

    const closureEvent =
      closureEvents.length > 0
        ? closureEvents[closureEvents.length - 1]
        : null;

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
          String(
            item?.code ??
            item?.resultCode ??
            '',
          )
            .trim()
            .toUpperCase() === closureReasonCode,
      ) ?? null;

    const closedAt =
      stage?.closedAt ??
      null;

    this.closureDraft = {
      stageId:
        stage?.id ??
        stage?.stageId ??
        closureEvent?.stageId ??
        null,

      closureReason,
      closureReasonCode:
        closureReason?.code ??
        closureReasonCode ??
        null,

      closureDate:
        closedAt
          ? parseBackendDate(String(closedAt).slice(0, 10))
          : null,

      closureComment:
        stage?.closureComment ??
        this.episode?.closureComment ??
        '',
    };
  }

  private buildCitationRows(): void {
    const citationEvents = this.correctionEvents.filter(
      (event: any) =>
        String(
          event?.eventType?.code ??
          event?.eventTypeCode ??
          '',
        )
          .trim()
          .toUpperCase() === 'CITACION',
    );

    const attendanceEvents = this.correctionEvents.filter(
      (event: any) =>
        String(
          event?.eventType?.code ??
          event?.eventTypeCode ??
          '',
        )
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
        if (
          citation?.eventDate &&
          !(citation.eventDate instanceof Date)
        ) {
          citation.eventDate =
            parseBackendDate(String(citation.eventDate));
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
    const selectedProgramId = Number(
      this.selectedProgramForAdminAction,
    );

    this.professionals = [];
    this.professionalsError = '';

    if (!selectedProgramId) {
      return;
    }

    this.isLoadingProfessionals = true;

    this.programProfessionalService
      .getActive()
      .pipe(
        finalize(
          () => (this.isLoadingProfessionals = false),
        ),
      )
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
            .map((item: any) =>
              normalizeProfessionalForCitation(item),
            )
            .filter((item: any) => {
              const isActive =
                !!item?.id &&
                !item?.deletedAt &&
                item?.active !== false;

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
          console.error(
            '[EpisodePurge] Error cargando facultativos:',
            error,
          );

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

    const selectedProgramId = Number(
      this.selectedProgramForAdminAction,
    );

    if (!selectedProgramId) {
      this.correctionDraft = null;
      this.correctionEvents = [];
      return;
    }

    this.adminMode = 'correction';

    console.log(
      '[EpisodePurge] Cronología disponible:',
      {
        longitudinalKeys: Object.keys(this.longitudinal ?? {}),
        episodeKeys: Object.keys(this.episode ?? {}),
        stages: Array.isArray(this.longitudinal?.stages)
          ? this.longitudinal.stages.map((stage: any) => ({
              stageId:
                stage?.id ??
                stage?.stageId ??
                null,
              program:
                stage?.program?.name ??
                stage?.programName ??
                null,
              keys: Object.keys(stage ?? {}),
            }))
          : [],
      },
    );
    this.loadCorrectionCatalogs();
    this.loadCorrectionSubstances();

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

      originalRequestDate:
        parseBackendDate(
          this.episode?.originalRequestDate ??
          this.episode?.requestDate ??
          null,
        ),

      episodeTypeId:
        this.episode?.episodeType?.id ??
        this.episode?.episodeTypeId ??
        null,

      previousTreatmentNumber:
        this.episode?.previousTreatmentNumber ??
        null,

      primarySubstanceId: null,
      secondarySubstances: [],

      contactTypeId:
        this.episode?.contactType?.id ??
        this.episode?.contactTypeId ??
        null,

      senderId:
        this.episode?.sender?.id ??
        this.episode?.senderId ??
        null,

      diverterId:
        this.episode?.diverter?.id ??
        this.episode?.diverterId ??
        null,

      stateCode:
        this.episode?.state?.code ??
        this.episode?.stateCode ??
        null,

      resultCode:
        this.episode?.result?.code ??
        this.episode?.resultCode ??
        null,
    };

    console.log('[EpisodePurge] fecha correctionDraft', {
      episodeOriginalRequestDate: this.episode?.originalRequestDate,
      episodeRequestDate: this.episode?.requestDate,
      correctionOriginalRequestDate:
        this.correctionDraft?.originalRequestDate,
      isDate:
        this.correctionDraft?.originalRequestDate instanceof Date,
    });

    const selectedEpisodeId = Number(this.episodeId);

    const sourceEvents = Array.isArray(this.longitudinal?.events)
      ? this.longitudinal.events.filter(
          (event: any) =>
            Number(event?.episodeId) === selectedEpisodeId &&
            Number(
              event?.program?.id ??
              event?.programId ??
              0
            ) === selectedProgramId,
        )
      : [];

    this.correctionEvents = JSON.parse(
      JSON.stringify(sourceEvents),
    ).sort((left: any, right: any) => {
      const leftDateTime =
        String(left?.eventDate ?? '') +
        'T' +
        String(left?.eventTime ?? '00:00:00');

      const rightDateTime =
        String(right?.eventDate ?? '') +
        'T' +
        String(right?.eventTime ?? '00:00:00');

      const dateComparison =
        leftDateTime.localeCompare(rightDateTime);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return String(left?.createdAt ?? '').localeCompare(
        String(right?.createdAt ?? ''),
      );
    });

    this.correctionEvents.forEach((event: any) => {
      if (event?.eventTime) {
        event.eventTime = String(event.eventTime).slice(0, 5);
      }
    });

    this.buildCitationRows();
    this.buildFeedbackDraft();
    this.buildClosureDraft();
  }

  onEpisodeIdChange(): void {
    this.longitudinal = null;
    this.adminMode = null;
    this.correctionDraft = null;
    this.correctionEvents = [];
    this.selectedSecondarySubstanceId = null;
    this.episode = null;
    this.purgeResult = null;
    this.confirmationCode = '';
    this.errorMessage = '';
  }

  searchEpisode(): void {
    const episodeId = this.episodeId;

    if (!episodeId) {
      this.errorMessage = 'Ingrese un ID de episodio válido.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
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

          const selectedEpisodeEvents = Array.isArray(response?.events)
            ? response.events.filter(
                (event: any) =>
                  Number(event?.episodeId) === Number(episodeId),
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

          console.log(
            '[EpisodePurge] RETROALIMENTACION hora:',
            {
              id: selectedFeedback?.id,
              eventDate: selectedFeedback?.eventDate,
              eventTime: selectedFeedback?.eventTime,
              createdAt: selectedFeedback?.createdAt,
            },
          );

          if (Array.isArray(response?.events)) {
            response.events
              .slice(0, 3)
              .forEach((event: any, index: number) => {
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
                  stageId:
                    stage?.id ??
                    stage?.stageId ??
                    null,
                  keys: Object.keys(stage ?? {}),
                }))
              : [],
          );

          console.log(
            '[EpisodePurge] Estructura cronológica:',
            {
              events:
                response?.events ??
                response?.episodeEvents ??
                null,

              stages: Array.isArray(response?.stages)
                ? response.stages.map((stage: any) => ({
                    id: stage?.id ?? stage?.stageId ?? null,
                    program:
                      stage?.program?.name ??
                      stage?.programName ??
                      null,
                    receivedAt: stage?.receivedAt ?? null,
                    closedAt: stage?.closedAt ?? null,
                    events:
                      stage?.events ??
                      stage?.episodeEvents ??
                      null,
                  }))
                : [],

              episodeEvents:
                episode?.events ??
                episode?.episodeEvents ??
                null,
            },
          );

          console.log(
            '[EpisodePurge] Datos episodio seleccionado:',
            {
              id: episode?.id ?? episode?.episodeId ?? null,
              episodeCode:
                episode?.episodeCode ??
                episode?.code ??
                null,

              originalRequestDate:
                episode?.originalRequestDate ??
                episode?.requestDate ??
                null,

              initialProgram:
                episode?.initialProgram ??
                null,

              initialProgramId:
                episode?.initialProgramId ??
                episode?.initialProgram?.id ??
                null,

              initialProgramName:
                episode?.initialProgramName ??
                episode?.initialProgram?.name ??
                null,

              currentProgram:
                episode?.currentProgram ??
                null,
            },
          );
        },
        error: (error: HttpErrorResponse) => {
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
    return String(value ?? '').trim().toUpperCase();
  }
}
