import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { ProgramProfessional } from '../../models/program-professional.model';
import { ProgramProfessionalService } from '../../services/program-professional.service';
import { ProgramService } from '../../services/program.service';
import { ProfessionService } from '../../services/profession.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

type StatusFilter = 'ACTIVE' | 'DELETED' | 'ALL';

interface CatalogOption {
  id: number;
  name?: string;
  nombre?: string;
  description?: string;
  deletedAt?: string | null;
}

interface ProgramProfessionalFormValue {
  name: string;
  professionId: number | null;
  email: string;
  phone: string;
  programIds: number[];
  observation: string;
}

interface DeletedProgramRelation {
  id: number;
  programProfessionalId?: number | null;
  programId?: number | null;
  programName?: string | null;
  active?: boolean | null;
  createdAt?: string | null;
  deletedAt?: string | null;
  program?: {
    id: number;
    name?: string;
    nombre?: string;
  } | null;
}

@Component({
  selector: 'app-program-professionals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './program-professionals.component.html',
  styleUrls: ['./program-professionals.component.scss'],
})
export class ProgramProfessionalsComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly programProfessionalService = inject(
    ProgramProfessionalService,
  );

  private readonly programService = inject(ProgramService);
  private readonly professionService = inject(ProfessionService);
  private readonly dialog = inject(MatDialog);

  professionals: ProgramProfessional[] = [];
  filteredProfessionals: ProgramProfessional[] = [];

  programs: CatalogOption[] = [];
  professions: CatalogOption[] = [];

  selectedProfessional: ProgramProfessional | null = null;
  deletedProgramRelations: DeletedProgramRelation[] = [];

  showForm = false;
  isLoading = false;
  isSaving = false;

  readonly filtersForm = this.fb.group({
    search: [''],
    programId: new FormControl<number | null>(null),
    status: this.fb.control<StatusFilter>('ACTIVE'),
  });

  readonly professionalForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(180)]],
    professionId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    email: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', [Validators.maxLength(60)]],
    programIds: this.fb.control<number[]>([], {
      validators: [Validators.required],
    }),
    observation: ['', [Validators.maxLength(500)]],
  });

  async ngOnInit(): Promise<void> {
    this.filtersForm.controls.search.valueChanges.subscribe(() =>
      this.applyFilters(),
    );

    this.filtersForm.controls.programId.valueChanges.subscribe(() =>
      this.applyFilters(),
    );

    this.filtersForm.controls.status.valueChanges.subscribe(() => {
      void this.loadProfessionals();
    });

    await this.loadCatalogs();
    await this.loadProfessionals();
  }
  async loadCatalogs(): Promise<void> {
    try {
      const [programsResponse, professionsResponse] = await Promise.all([
        firstValueFrom(this.programService.getAll()),
        firstValueFrom(this.professionService.getAll()),
      ]);

      this.programs = this.normalizeCatalog(programsResponse);
      this.professions = this.normalizeCatalog(professionsResponse);
    } catch (error) {
      console.error('No fue posible cargar programas/profesiones', error);
      this.programs = [];
      this.professions = [];
    }
  }

  async loadProfessionals(): Promise<void> {
    this.isLoading = true;

    try {
      const status = this.filtersForm.controls.status.value;

      let response: ProgramProfessional[];

      if (status === 'DELETED') {
        response = await firstValueFrom(
          this.programProfessionalService.getDeleted(),
        );
      } else if (status === 'ALL') {
        response = await firstValueFrom(
          this.programProfessionalService.getAll(),
        );
      } else {
        response = await firstValueFrom(
          this.programProfessionalService.getActive(),
        );
      }

      this.professionals = this.extractArray(response).map((item) =>
        this.normalizeProfessional(item),
      );

      this.applyFilters();
    } catch (error) {
      console.error('No fue posible cargar facultativos', error);
      this.professionals = [];
      this.filteredProfessionals = [];
    } finally {
      this.isLoading = false;
    }
  }

  private async loadDeletedProgramRelations(
    professionalId: number,
  ): Promise<DeletedProgramRelation[]> {
    try {
      const response = await firstValueFrom(
        this.programProfessionalService.getDeletedProgramRelations(
          professionalId,
        ),
      );

      const relations = this.extractArray(response).map((relation: any) => ({
        id: Number(relation?.id),

        programProfessionalId: Number(
          relation?.programProfessionalId ??
            relation?.program_professional_id ??
            professionalId,
        ),

        programId: Number(
          relation?.programId ?? relation?.program_id ?? relation?.program?.id,
        ),

        programName:
          relation?.programName ??
          relation?.program_name ??
          relation?.program?.name ??
          relation?.program?.nombre ??
          null,

        active: relation?.active ?? null,

        createdAt: relation?.createdAt ?? relation?.created_at ?? null,

        deletedAt: relation?.deletedAt ?? relation?.deleted_at ?? null,

        program: relation?.program
          ? {
              id: Number(relation.program.id),
              name: relation.program.name ?? relation.program.nombre ?? '',
              nombre: relation.program.nombre ?? relation.program.name ?? '',
            }
          : null,
      }));

      this.deletedProgramRelations = relations.filter(
        (relation) =>
          Number.isFinite(relation.id) &&
          relation.id > 0 &&
          Number.isFinite(Number(relation.programId)) &&
          Number(relation.programId) > 0,
      );

      console.log(
        'Relaciones de programa eliminadas:',
        this.deletedProgramRelations,
      );

      return this.deletedProgramRelations;
    } catch (error) {
      console.error(
        'No fue posible consultar las relaciones eliminadas del facultativo',
        error,
      );

      this.deletedProgramRelations = [];
      return [];
    }
  }

  private getLatestDeletedProgramIds(
    relations: DeletedProgramRelation[],
  ): number[] {
    const validRelations = relations.filter((relation) => {
      const programId = Number(relation.programId);
      const deletedTimestamp = Date.parse(String(relation.deletedAt ?? ''));

      return (
        Number.isFinite(programId) &&
        programId > 0 &&
        Number.isFinite(deletedTimestamp)
      );
    });

    if (!validRelations.length) {
      return [];
    }

    const latestDeletedTimestamp = Math.max(
      ...validRelations.map((relation) =>
        Date.parse(String(relation.deletedAt)),
      ),
    );

    const latestProgramIds = validRelations
      .filter(
        (relation) =>
          Date.parse(String(relation.deletedAt)) === latestDeletedTimestamp,
      )
      .map((relation) => Number(relation.programId))
      .filter((programId) => Number.isFinite(programId) && programId > 0);

    return [...new Set(latestProgramIds)];
  }

  openCreateForm(): void {
    this.selectedProfessional = null;
    this.showForm = true;

    this.professionalForm.reset({
      name: '',
      professionId: null,
      email: '',
      phone: '',
      programIds: [],
      observation: '',
    });

    this.professionalForm.markAsPristine();
    this.professionalForm.markAsUntouched();
  }

  async openEditForm(professional: ProgramProfessional): Promise<void> {
    if (!professional?.id) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await firstValueFrom(
        this.programProfessionalService.findById(professional.id),
      );

      const normalized = this.normalizeProfessional(response);

      this.selectedProfessional = normalized;
      this.showForm = true;

      const phoneDigits = String(normalized.phone ?? '')
        .replace(/\D/g, '')
        .slice(-8);

      this.professionalForm.reset({
        name: normalized.name ?? '',
        professionId: normalized.professionId ?? null,
        email: normalized.email ?? '',
        phone: phoneDigits,
        programIds: [...(normalized.programIds ?? [])],
        observation: normalized.observation ?? '',
      });

      this.professionalForm.markAsPristine();
      this.professionalForm.markAsUntouched();
    } catch (error) {
      console.error(
        'No fue posible obtener el facultativo para edición',
        error,
      );
    } finally {
      this.isLoading = false;
    }
  }

  cancelForm(): void {
    if (this.isSaving) {
      return;
    }

    this.showForm = false;
    this.selectedProfessional = null;

    this.professionalForm.reset({
      name: '',
      professionId: null,
      email: '',
      phone: '',
      programIds: [],
      observation: '',
    });
  }

  async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    if (this.professionalForm.invalid) {
      this.professionalForm.markAllAsTouched();
      return;
    }

    const raw =
      this.professionalForm.getRawValue() as ProgramProfessionalFormValue;

    const payload = {
      name: raw.name.trim(),
      professionId: Number(raw.professionId),
      email: raw.email?.trim() || null,
      phone: this.buildPhoneNumber(raw.phone),
      observation: raw.observation?.trim() || null,
      active: true,
      programIds: (raw.programIds ?? []).map((id) => Number(id)),
    };

    const professionalId = this.selectedProfessional?.id ?? null;

    this.isSaving = true;

    try {
      if (professionalId) {
        await firstValueFrom(
          this.programProfessionalService.update(professionalId, payload),
        );
      } else {
        await firstValueFrom(this.programProfessionalService.create(payload));
      }

      // Cerrar inmediatamente después de una respuesta exitosa.
      this.showForm = false;
      this.selectedProfessional = null;

      this.professionalForm.reset({
        name: '',
        professionId: null,
        email: '',
        phone: '',
        programIds: [],
        observation: '',
      });

      // Recargar el listado después de cerrar el card.
      await this.loadProfessionals();
    } catch (error) {
      console.error(
        professionalId
          ? 'No fue posible modificar el facultativo'
          : 'No fue posible crear el facultativo',
        error,
      );
    } finally {
      this.isSaving = false;
    }
  }

  async delete(professional: ProgramProfessional): Promise<void> {
    if (!professional?.id) {
      return;
    }

    const confirmed = await this.confirmAction(
      'Eliminar facultativo',
      `¿Seguro que deseas eliminar “${professional.name}” (ID: ${professional.id})?`,
      'Eliminar',
      'warn',
      'delete',
    );

    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(
        this.programProfessionalService.delete(professional.id),
      );

      await this.loadProfessionals();
    } catch (error) {
      console.error('No fue posible eliminar el facultativo', error);
    }
  }

  async restore(professional: ProgramProfessional): Promise<void> {
    const professionalId = Number(professional?.id);

    if (!professionalId || this.isLoading) {
      return;
    }

    const confirmed = await this.confirmAction(
      'Restaurar facultativo',
      `¿Seguro que deseas restaurar “${professional.name}” (ID: ${professionalId})?`,
      'Restaurar',
      'primary',
      'restore',
    );

    if (!confirmed) {
      return;
    }

    this.isLoading = true;

    try {
      /*
       * 1. Consultar las relaciones eliminadas antes del restore.
       * En este momento todavía conservan sus fechas de eliminación.
       */
      const deletedRelations =
        await this.loadDeletedProgramRelations(professionalId);

      /*
       * 2. Obtener solamente los programas correspondientes
       * al último lote eliminado.
       */
      const latestProgramIds =
        this.getLatestDeletedProgramIds(deletedRelations);

      console.log(
        'Programas correspondientes al último lote eliminado:',
        latestProgramIds,
      );

      /*
       * 3. Restaurar el facultativo.
       * Actualmente backend restaura todas las relaciones históricas.
       */
      await firstValueFrom(
        this.programProfessionalService.restore(professionalId),
      );

      /*
       * 4. Obtener los datos completos del facultativo ya restaurado.
       */
      const restoredResponse = await firstValueFrom(
        this.programProfessionalService.findById(professionalId),
      );

      const restoredProfessional = this.normalizeProfessional(restoredResponse);

      /*
       * 5. Corregir temporalmente las asociaciones:
       * dejamos activos únicamente los programas del último lote.
       */
      if (latestProgramIds.length) {
        const correctionPayload = {
          name: String(restoredProfessional.name ?? '').trim(),

          professionId: Number(restoredProfessional.professionId),

          email: String(restoredProfessional.email ?? '').trim() || null,

          phone: this.buildPhoneNumber(restoredProfessional.phone),

          observation:
            String(restoredProfessional.observation ?? '').trim() || null,

          active: true,

          programIds: latestProgramIds,
        };

        await firstValueFrom(
          this.programProfessionalService.update(
            professionalId,
            correctionPayload,
          ),
        );

        console.log(
          'Asociaciones corregidas después del restore:',
          latestProgramIds,
        );
      } else {
        console.warn(
          'No se encontraron relaciones eliminadas válidas para recuperar.',
        );
      }

      /*
       * 6. Verificación final.
       */
      const finalResponse = await firstValueFrom(
        this.programProfessionalService.findById(professionalId),
      );

      const finalProfessional = this.normalizeProfessional(finalResponse);

      console.log('Facultativo restaurado definitivamente:', finalProfessional);

      console.log(
        'Programas activos después de corregir la restauración:',
        finalProfessional.programIds,
      );

      await this.loadProfessionals();
    } catch (error) {
      console.error(
        'No fue posible restaurar el facultativo con sus programas',
        error,
      );
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    const search = this.normalizeText(this.filtersForm.controls.search.value);
    const selectedProgramId = this.filtersForm.controls.programId.value;
    const status = this.filtersForm.controls.status.value;

    this.filteredProfessionals = this.professionals.filter((item) => {
      const professional = this.normalizeProfessional(item);

      const matchesStatus =
        status === 'ALL' ||
        (status === 'ACTIVE' && !professional.deletedAt) ||
        (status === 'DELETED' && !!professional.deletedAt);

      const matchesProgram =
        !selectedProgramId ||
        professional.programIds.includes(Number(selectedProgramId));

      const searchableText = this.normalizeText(
        [
          professional.name,
          professional.professionName,
          this.getProfessionName(professional.professionId),
          professional.email,
          professional.phone,
          professional.observation,
          ...professional.programIds.map((id) => this.getProgramName(id)),
        ]
          .filter(Boolean)
          .join(' '),
      );

      const matchesSearch = !search || searchableText.includes(search);

      return matchesStatus && matchesProgram && matchesSearch;
    });
  }

  private buildPhoneNumber(value: string | null | undefined): string | null {
    const digits = String(value ?? '').replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    const lastEightDigits = digits.slice(-8);

    if (lastEightDigits.length !== 8) {
      return null;
    }

    return `+56 9 ${lastEightDigits}`;
  }

  getProgramName(programId: number | null | undefined): string {
    if (!programId) {
      return 'Sin programa';
    }

    const program = this.programs.find(
      (item) => Number(item.id) === Number(programId),
    );
    return program?.name || program?.nombre || `Programa ${programId}`;
  }

  getProfessionName(professionId: number | null | undefined): string {
    if (!professionId) {
      return 'Sin profesión';
    }

    const profession = this.professions.find(
      (item) => Number(item.id) === Number(professionId),
    );

    return (
      profession?.name || profession?.nombre || `Profesión ${professionId}`
    );
  }

  private normalizeProfessional(
    professional: ProgramProfessional,
  ): ProgramProfessional {
    const activePrograms = Array.isArray(professional.programs)
      ? professional.programs.filter((program: any) => {
          const deletedAt =
            program?.deletedAt ??
            program?.deleted_at ??
            program?.relationDeletedAt ??
            program?.relation_deleted_at ??
            program?.programRelation?.deletedAt ??
            program?.programRelation?.deleted_at ??
            null;

          const active =
            program?.active ??
            program?.relationActive ??
            program?.programRelation?.active;

          return !deletedAt && active !== false;
        })
      : [];

    const programIds =
      activePrograms.length > 0
        ? activePrograms
            .map((program: any) =>
              Number(
                program?.id ??
                  program?.programId ??
                  program?.program_id ??
                  program?.program?.id,
              ),
            )
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : Array.isArray(professional.programIds)
          ? professional.programIds
              .map(Number)
              .filter((id) => Number.isFinite(id) && id > 0)
          : [];

    return {
      ...professional,
      id: Number(professional.id),
      professionId: Number(professional.professionId),
      programIds,
      programs: activePrograms,
    };
  }

  private normalizeProgramIds(raw: any): number[] {
    if (Array.isArray(raw?.programIds)) {
      return raw.programIds.map(Number).filter(Boolean);
    }

    if (Array.isArray(raw?.program_ids)) {
      return raw.program_ids.map(Number).filter(Boolean);
    }

    if (Array.isArray(raw?.programs)) {
      return raw.programs
        .map((program: any) => Number(program?.id ?? program?.programId))
        .filter(Boolean);
    }

    if (Array.isArray(raw?.programProfessionalPrograms)) {
      return raw.programProfessionalPrograms
        .map((relation: any) =>
          Number(
            relation?.programId ??
              relation?.program_id ??
              relation?.program?.id,
          ),
        )
        .filter(Boolean);
    }

    return [];
  }

  private normalizeCatalog(raw: any): CatalogOption[] {
    return this.extractArray(raw)
      .map((item) => ({
        id: Number(item.id),
        name: item.name ?? item.nombre ?? item.description ?? '',
        nombre: item.nombre ?? item.name ?? item.description ?? '',
        description: item.description ?? null,
        deletedAt: item.deletedAt ?? item.deleted_at ?? null,
      }))
      .filter((item) => !!item.id && !item.deletedAt);
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

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private async confirmAction(
    title: string,
    message: string,
    confirmText = 'Aceptar',
    color: 'primary' | 'warn' = 'primary',
    icon = 'help',
  ): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title,
        message,
        confirmText,
        cancelText: 'Cancelar',
        color,
        icon,
      },
    });

    const result = await firstValueFrom(ref.afterClosed());

    return result === true;
  }
}
