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
  cities: CatalogItem[] = [];

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

    this.catalogs.getDemandCatalog('cities').subscribe({
      next: (rows) => (this.cities = rows),
      error: (err) =>
        console.error('[ProgramDialog] Error cargando ciudades:', err),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.form.disable();

    const raw = this.form.getRawValue();
    const id = raw.id ? Number(raw.id) : null;

    const payload: Partial<Program> = {
      name: String(raw.name || '').trim(),

      populationTypeId: raw.populationTypeId
        ? Number(raw.populationTypeId)
        : null,
      modalityId: raw.modalityId ? Number(raw.modalityId) : null,
      planId: raw.planId ? Number(raw.planId) : null,
      regionId: raw.regionId ? Number(raw.regionId) : null,
      cityId: raw.cityId ? Number(raw.cityId) : null,

      address: raw.address || null,
      phone: raw.phone || null,
      email: raw.email || null,
      description: raw.description || null,
    };

    const req = id
      ? this.api.update(id, payload as Program)
      : this.api.save(payload as Program);

    req.subscribe({
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