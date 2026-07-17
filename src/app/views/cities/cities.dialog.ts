import {
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '../../services/catalog-maintainer.service';

export interface CityItem extends CatalogItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  regionId: number | null;
  regionCode: string | null;
  regionName: string | null;
  deletedAt?: string | null;
}

export interface RegionItem extends CatalogItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  deletedAt?: string | null;
}

export interface CitiesDialogData {
  mode: 'create' | 'edit';
  item?: CityItem;
}

interface CityPayload extends CatalogItem {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  regionId: number;
}

@Component({
  selector: 'app-cities-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './cities.dialog.html',
  styleUrl: './cities.dialog.scss',
})
export class CitiesDialogComponent implements OnInit {
  private readonly cityResource = 'cities';
  private readonly regionResource = 'regions';

  form: FormGroup;

  regions: RegionItem[] = [];

  isLoadingRegions = false;
  isSaving = false;

  loadRegionsError = '';
  saveError = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly catalogService: CatalogMaintainerService,
    private readonly dialogRef: MatDialogRef<CitiesDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA)
    public readonly data: CitiesDialogData,
  ) {
    this.form = this.fb.group({
      code: [
        '',
        [
          Validators.required,
          Validators.maxLength(100),
          Validators.pattern(/^[A-Z0-9_]+$/),
        ],
      ],
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(150),
        ],
      ],
      regionId: [
        null,
        Validators.required,
      ],
      description: [
        '',
        Validators.maxLength(500),
      ],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.loadRegions();

    if (this.data.mode === 'edit' && this.data.item) {
      this.form.patchValue({
        code: this.data.item.code,
        name: this.data.item.name,
        regionId: this.data.item.regionId,
        description: this.data.item.description ?? '',
        active: this.data.item.active,
      });
    }
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEditMode
      ? 'Editar comuna'
      : 'Nueva comuna';
  }

  get dialogDescription(): string {
    return this.isEditMode
      ? 'Modifica los datos territoriales de la comuna.'
      : 'Registra una comuna y asóciala a la región correspondiente.';
  }

  loadRegions(): void {
    this.isLoadingRegions = true;
    this.loadRegionsError = '';

    this.catalogService
      .getAll(this.regionResource, {
        active: true,
      })
      .subscribe({
        next: (response) => {
          this.regions = ((response ?? []) as RegionItem[])
            .filter(
              (region) =>
                region.active &&
                !region.deletedAt,
            )
            .sort((a, b) =>
              a.name.localeCompare(
                b.name,
                'es',
                { sensitivity: 'base' },
              ),
            );

          this.isLoadingRegions = false;
        },
        error: (error) => {
          console.error(
            '[CitiesDialog] Error cargando regiones:',
            error,
          );

          this.loadRegionsError =
            'No fue posible cargar el listado de regiones.';

          this.isLoadingRegions = false;
        },
      });
  }

  normalizeCode(): void {
    const currentValue =
      this.form.controls['code'].value ?? '';

    const normalizedValue = String(currentValue)
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    this.form.controls['code'].setValue(
      normalizedValue,
      {
        emitEvent: false,
      },
    );
  }

  generateCodeFromName(): void {
    const codeControl = this.form.controls['code'];

    if (
      this.isEditMode ||
      String(codeControl.value ?? '').trim()
    ) {
      return;
    }

    const nameValue =
      this.form.controls['name'].value ?? '';

    const generatedCode = String(nameValue)
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    codeControl.setValue(generatedCode);
  }

  cancel(): void {
    if (this.isSaving) {
      return;
    }

    this.dialogRef.close(false);
  }

  save(): void {
    this.saveError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    const payload: CityPayload = {
      code: String(rawValue.code).trim(),
      name: String(rawValue.name).trim(),
      description:
        String(rawValue.description ?? '').trim() ||
        null,
      active: Boolean(rawValue.active),
      regionId: Number(rawValue.regionId),
    };

    this.isSaving = true;
    this.form.disable({
      emitEvent: false,
    });

    const request$ =
      this.isEditMode && this.data.item
        ? this.catalogService.update(
            this.cityResource,
            this.data.item.id,
            payload,
          )
        : this.catalogService.create(
            this.cityResource,
            payload,
          );

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error(
          '[CitiesDialog] Error guardando comuna:',
          error,
        );

        this.saveError =
          this.resolveSaveError(error);

        this.isSaving = false;
        this.form.enable({
          emitEvent: false,
        });
      },
    });
  }

  hasError(
    controlName: string,
    errorName: string,
  ): boolean {
    const control =
      this.form.get(controlName);

    return Boolean(
      control &&
        control.touched &&
        control.hasError(errorName),
    );
  }

  private resolveSaveError(error: any): string {
    const backendMessage =
      error?.error?.message ??
      error?.error?.error ??
      error?.message;

    if (
      error?.status === 409 ||
      String(backendMessage ?? '')
        .toLowerCase()
        .includes('duplicate')
    ) {
      return 'Ya existe una comuna con el mismo código o nombre.';
    }

    if (error?.status === 403) {
      return 'No tienes permisos para guardar esta comuna.';
    }

    if (error?.status === 400) {
      return (
        backendMessage ||
        'Los datos enviados no son válidos.'
      );
    }

    return (
      backendMessage ||
      'No fue posible guardar la comuna. Intenta nuevamente.'
    );
  }
}