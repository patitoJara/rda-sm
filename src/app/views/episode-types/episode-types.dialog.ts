// ============================================================
// ✅ EPISODE TYPES DIALOG
// Crear / editar tipo de episodio
// ============================================================

import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { firstValueFrom } from 'rxjs';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '../../services/catalog-maintainer.service';

interface EpisodeTypesDialogData {
  item: CatalogItem | null;
  resource: string;
}

@Component({
  selector: 'app-episode-types-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './episode-types.dialog.html',
  styleUrls: ['./episode-types.dialog.scss'],
})
export class EpisodeTypesDialogComponent {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogMaintainerService);
  private ref = inject(MatDialogRef<EpisodeTypesDialogComponent>);

  saving = false;
  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: EpisodeTypesDialogData) {
    this.form = this.fb.group({
      id: [this.data.item?.id ?? null],
      code: [this.data.item?.code ?? '', [Validators.required]],
      name: [this.data.item?.name ?? '', [Validators.required]],
      description: [this.data.item?.description ?? ''],
      active: [this.data.item?.active ?? true],
    });
  }

  get isEdit(): boolean {
    return !!this.data.item?.id;
  }

  close(): void {
    this.ref.close(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    try {
      const raw = this.form.getRawValue();

      const payload: CatalogItem = {
        code: String(raw.code || '').trim().toUpperCase(),
        name: String(raw.name || '').trim(),
        description: String(raw.description || '').trim(),
        active: !!raw.active,
      };

      if (this.isEdit && this.data.item?.id) {
        await firstValueFrom(
          this.catalogService.update(
            this.data.resource,
            this.data.item.id,
            payload,
          ),
        );
      } else {
        await firstValueFrom(
          this.catalogService.create(this.data.resource, payload),
        );
      }

      this.ref.close(true);
    } catch (error) {
      console.error('[EpisodeTypesDialog] Error guardando:', error);
      alert('No fue posible guardar el tipo de episodio.');
    } finally {
      this.saving = false;
    }
  }
}