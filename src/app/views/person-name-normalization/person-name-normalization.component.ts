import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Postulant } from '@app/models/postulant';
import { PostulantService } from '@app/services/postulant.service';
import { formatPersonName } from '@app/core/utils/text.utils';

interface PersonNameNormalizationRow {
  id: number;
  rut: string;

  firstNameBefore: string;
  firstNameAfter: string;

  lastNameBefore: string;
  lastNameAfter: string;

  firstLastNameBefore: string;
  firstLastNameAfter: string;

  secondLastNameBefore: string;
  secondLastNameAfter: string;
}

@Component({
  standalone: true,
  selector: 'app-person-name-normalization',
  templateUrl: './person-name-normalization.component.html',
  styleUrls: ['./person-name-normalization.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
})
export class PersonNameNormalizationComponent {
  loading = false;
  analyzed = false;
  savingId: number | null = null;

  errorMessage: string | null = null;
  successMessage: string | null = null;

  totalPersons = 0;
  normalizedPersons = 0;
  pendingPersons = 0;

  rows: PersonNameNormalizationRow[] = [];

  readonly selectedIds = new Set<number>();

  processingBulk = false;

  readonly displayedColumns = [
    'select',
    'rut',
    'firstName',
    'lastName',
    'firstLastName',
    'secondLastName',
    'actions',
  ];

  constructor(
    private readonly postulantService: PostulantService,
  ) {}

  async analyze(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.analyzed = false;
    this.errorMessage = null;
    this.rows = [];
    this.selectedIds.clear();

    try {
      const persons = await firstValueFrom(
        this.postulantService.getAllRaw(),
      );

      const rows = persons
        .map((person) => this.buildRow(person))
        .filter(
          (row): row is PersonNameNormalizationRow =>
            row !== null,
        );

      this.totalPersons = persons.length;
      this.pendingPersons = rows.length;
      this.normalizedPersons =
        this.totalPersons - this.pendingPersons;

      this.rows = rows;
      this.analyzed = true;
    } catch (error) {
      console.error(
        '[PersonNameNormalization] Error analizando postulantes:',
        error,
      );

      this.errorMessage =
        'No fue posible analizar los nombres de los demandantes.';
    } finally {
      this.loading = false;
    }
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  isSelected(
    row: PersonNameNormalizationRow,
  ): boolean {
    return this.selectedIds.has(row.id);
  }

  toggleSelection(
    row: PersonNameNormalizationRow,
    checked: boolean,
  ): void {
    if (checked) {
      this.selectedIds.add(row.id);
      return;
    }

    this.selectedIds.delete(row.id);
  }

  areAllSelected(): boolean {
    return (
      this.rows.length > 0 &&
      this.selectedIds.size === this.rows.length
    );
  }

  isSelectionIndeterminate(): boolean {
    return (
      this.selectedIds.size > 0 &&
      this.selectedIds.size < this.rows.length
    );
  }

  toggleAll(
    checked: boolean,
  ): void {
    this.selectedIds.clear();

    if (!checked) {
      return;
    }

    for (const row of this.rows) {
      this.selectedIds.add(row.id);
    }
  }


  async regularizeRow(
    row: PersonNameNormalizationRow,
  ): Promise<void> {
    if (
      this.savingId !== null ||
      this.processingBulk
    ) {
      return;
    }

    const confirmed = window.confirm(
      `¿Regularizar los nombres del RUN ${row.rut}?`,
    );

    if (!confirmed) {
      return;
    }

    this.savingId = row.id;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      await this.updateRow(row);

      this.successMessage =
        `RUN ${row.rut} regularizado correctamente.`;

      await this.analyze();
    } catch (error) {
      console.error(
        '[PersonNameNormalization] Error regularizando postulante:',
        error,
      );

      this.errorMessage =
        `No fue posible regularizar el RUN ${row.rut}.`;
    } finally {
      this.savingId = null;
    }
  }

  async regularizeSelected(): Promise<void> {
    if (
      this.processingBulk ||
      this.savingId !== null ||
      this.selectedIds.size === 0
    ) {
      return;
    }

    const selectedRows = this.rows.filter((row) =>
      this.selectedIds.has(row.id),
    );

    if (selectedRows.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `¿Regularizar ${selectedRows.length} registro(s) seleccionado(s)?`,
    );

    if (!confirmed) {
      return;
    }

    this.processingBulk = true;
    this.errorMessage = null;
    this.successMessage = null;

    let updated = 0;
    const failed: string[] = [];

    try {
      for (const row of selectedRows) {
        this.savingId = row.id;

        try {
          await this.updateRow(row);
          updated++;
        } catch (error) {
          console.error(
            `[PersonNameNormalization] Error regularizando RUN ${row.rut}:`,
            error,
          );

          failed.push(row.rut);
        }
      }

      await this.analyze();

      if (failed.length === 0) {
        this.successMessage =
          `${updated} registro(s) regularizado(s) correctamente.`;
      } else {
        this.errorMessage =
          `${updated} registro(s) actualizados. ` +
          `${failed.length} registro(s) presentaron error: ` +
          failed.join(', ');
      }
    } finally {
      this.savingId = null;
      this.processingBulk = false;
    }
  }

  private async updateRow(
    row: PersonNameNormalizationRow,
  ): Promise<void> {
    const person = await firstValueFrom(
      this.postulantService.getById(row.id),
    );

    const payload: Partial<Postulant> = {
      firstName: row.firstNameAfter || null,
      lastName: row.lastNameAfter || null,
      firstLastName: row.firstLastNameAfter || null,
      secondLastName: row.secondLastNameAfter || null,

      rut: person.rut ?? null,
      birthdate: person.birthdate ?? null,
      email: person.email ?? null,
      phone: person.phone ?? null,
      address: person.address ?? null,
    };

    const userId = Number(person.user?.id);

    if (Number.isFinite(userId) && userId > 0) {
      payload.user = {
        id: userId,
      };
    }

    const communeId = Number(person.commune?.id);

    if (
      Number.isFinite(communeId) &&
      communeId > 0
    ) {
      payload.commune = {
        id: communeId,
      };
    }

    const sexId = Number(person.sex?.id);

    if (
      Number.isFinite(sexId) &&
      sexId > 0
    ) {
      payload.sex = {
        id: sexId,
      };
    }

    const convPrevId =
      Number(person.convPrev?.id);

    const intPrevId =
      Number(person.convPrev?.intPrev?.id);

    if (
      Number.isFinite(convPrevId) &&
      convPrevId > 0 &&
      Number.isFinite(intPrevId) &&
      intPrevId > 0
    ) {
      payload.convPrev = {
        id: convPrevId,
        intPrev: {
          id: intPrevId,
        },
      };
    }

    await firstValueFrom(
      this.postulantService.update(
        row.id,
        payload,
      ),
    );
  }
  private buildRow(
    person: Postulant,
  ): PersonNameNormalizationRow | null {
    const id = Number(person.id);

    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }

    const firstNameBefore = person.firstName ?? '';
    const lastNameBefore = person.lastName ?? '';
    const firstLastNameBefore =
      person.firstLastName ?? '';
    const secondLastNameBefore =
      person.secondLastName ?? '';

    const firstNameAfter =
      this.normalizeName(firstNameBefore);

    const lastNameAfter =
      this.normalizeName(lastNameBefore);

    const firstLastNameAfter =
      this.normalizeName(firstLastNameBefore);

    const secondLastNameAfter =
      this.normalizeName(secondLastNameBefore);

    const changed =
      firstNameBefore !== firstNameAfter ||
      lastNameBefore !== lastNameAfter ||
      firstLastNameBefore !== firstLastNameAfter ||
      secondLastNameBefore !== secondLastNameAfter;

    if (!changed) {
      return null;
    }

    return {
      id,
      rut: person.rut ?? '',

      firstNameBefore,
      firstNameAfter,

      lastNameBefore,
      lastNameAfter,

      firstLastNameBefore,
      firstLastNameAfter,

      secondLastNameBefore,
      secondLastNameAfter,
    };
  }

  private normalizeName(
    value: string | null | undefined,
  ): string {
    return value ? formatPersonName(value) : '';
  }
}