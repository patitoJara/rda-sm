// src/app/views/program/program.dialog.ts

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { ProgramService } from '../../services/program.service';
import { Program } from '../../models/program';
import {
  CatalogItem,
  CatalogMaintainerService,
} from '../../services/catalog-maintainer.service';

interface CityCatalogItem extends CatalogItem {
  regionId?: number | null;
  regionCode?: string | null;
  regionName?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-program-dialog',
  templateUrl: './program.dialog.html',
  styleUrls: ['./program.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
  ],
})
export class ProgramDialogComponent implements OnInit {
  form!: FormGroup;

  populationTypes: CatalogItem[] = [];
  modalities: CatalogItem[] = [];
  plans: CatalogItem[] = [];
  regions: CatalogItem[] = [];

  cities: CityCatalogItem[] = [];
  filteredCities: CityCatalogItem[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ProgramService,
    private catalogs: CatalogMaintainerService,
    private ref: MatDialogRef<ProgramDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Program | null,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [this.data?.id ?? null],

      name: [
        this.data?.name ?? '',
        [Validators.required, Validators.maxLength(120)],
      ],

      populationTypeId: [this.data?.populationTypeId ?? null],
      modalityId: [this.data?.modalityId ?? null],
      planId: [this.data?.planId ?? null],
      regionId: [this.data?.regionId ?? null],
      cityId: [this.data?.cityId ?? null],

      address: [this.data?.address ?? ''],
      phone: [this.data?.phone ?? ''],
      email: [this.data?.email ?? ''],
      description: [this.data?.description ?? ''],
    });

    this.form.get('regionId')?.valueChanges.subscribe(() => {
      this.applyCityFilter(true);
    });

    this.loadCatalogs();
  }

  private loadCatalogs(): void {
    this.catalogs.getDemandCatalog('programPopulations').subscribe({
      next: (rows) => (this.populationTypes = rows),
      error: (err) =>
        console.error('[ProgramDialog] Error cargando poblaciones:', err),
    });

    this.catalogs.getDemandCatalog('programModalities').subscribe({
      next: (rows) => (this.modalities = rows),
      error: (err) =>
        console.error('[ProgramDialog] Error cargando modalidades:', err),
    });

    this.catalogs.getDemandCatalog('programPlans').subscribe({
      next: (rows) => (this.plans = rows),
      error: (err) =>
        console.error('[ProgramDialog] Error cargando planes:', err),
    });

    this.catalogs.getDemandCatalog('regions').subscribe({
      next: (rows) => (this.regions = rows),
      error: (err) =>
        console.error('[ProgramDialog] Error cargando regiones:', err),
    });

    this.catalogs
      .getAll('cities', {
        active: true,
        includeDeleted: false,
      })
      .subscribe({
        next: (rows) => {
          this.cities = rows as CityCatalogItem[];
          this.applyCityFilter(false);
        },
        error: (err) =>
          console.error('[ProgramDialog] Error cargando comunas:', err),
      });
  }

  /**
   * Filtra las comunas de acuerdo con la región seleccionada.
   *
   * clearInvalidSelection:
   * - true: cuando el usuario cambia la región, limpia una comuna incompatible.
   * - false: al cargar el diálogo, conserva la comuna almacenada.
   */
  private applyCityFilter(clearInvalidSelection: boolean): void {
    const regionId = this.toNullableNumber(this.form.get('regionId')?.value);

    if (regionId === null) {
      this.filteredCities = [...this.cities];

      if (clearInvalidSelection) {
        this.form.get('cityId')?.setValue(null, { emitEvent: false });
      }

      return;
    }

    this.filteredCities = this.cities.filter(
      (city) => this.toNullableNumber(city.regionId) === regionId,
    );

    if (!clearInvalidSelection) {
      return;
    }

    const selectedCityId = this.toNullableNumber(
      this.form.get('cityId')?.value,
    );

    if (selectedCityId === null) {
      return;
    }

    const cityBelongsToRegion = this.filteredCities.some(
      (city) => Number(city.id) === selectedCityId,
    );

    if (!cityBelongsToRegion) {
      this.form.get('cityId')?.setValue(null, { emitEvent: false });
    }
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.form.disable();

    const raw = this.form.getRawValue();
    const id = this.toNullableNumber(raw.id);

    const payload: Partial<Program> = {
      name: String(raw.name || '').trim(),

      populationTypeId: this.toNullableNumber(raw.populationTypeId),
      modalityId: this.toNullableNumber(raw.modalityId),
      planId: this.toNullableNumber(raw.planId),
      regionId: this.toNullableNumber(raw.regionId),
      cityId: this.toNullableNumber(raw.cityId),

      address: String(raw.address || '').trim() || null,
      phone: String(raw.phone || '').trim() || null,
      email: String(raw.email || '').trim() || null,
      description: String(raw.description || '').trim() || null,
    };

    const request$ = id
      ? this.api.update(id, payload as Program)
      : this.api.save(payload as Program);

    request$.subscribe({
      next: (row: Program) => this.ref.close(row),
      error: (err: unknown) => {
        console.error('[ProgramDialog] Error guardando:', err);
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
