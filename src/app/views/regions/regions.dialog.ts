import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { finalize } from 'rxjs/operators';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '@app/services/catalog-maintainer.service';

import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';

interface RegionFormValue {
  id: number | null;
  name: string;
  code: string;
  description: string;
  active: boolean;
}

@Component({
  standalone: true,
  selector: 'app-regions-dialog',
  templateUrl: './regions.dialog.html',
  styleUrls: ['./regions.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
})
export class RegionsDialogComponent implements OnInit {
  private readonly resource = 'regions';

  form!: FormGroup;
  saving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: CatalogMaintainerService,
    private readonly dialogRef: MatDialogRef<RegionsDialogComponent>,
    private readonly dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA)
    public data: CatalogItem | null,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [this.data?.id ?? null],

      name: [
        this.data?.name ?? '',
        [
          Validators.required,
          Validators.maxLength(120),
        ],
      ],

      code: [
        this.data?.code ?? '',
        [
          Validators.required,
          Validators.maxLength(80),
          Validators.pattern(/^[A-Za-z0-9_-]+$/),
        ],
      ],

      description: [
        this.data?.description ?? '',
        [
          Validators.maxLength(500),
        ],
      ],

      active: [this.data?.active ?? true],
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const value =
      this.form.getRawValue() as RegionFormValue;

    const payload: CatalogItem = {
      name: value.name.trim(),
      code: value.code.trim().toUpperCase(),
      description: value.description.trim() || null,
      active: value.active,
    };

    this.saving = true;
    this.form.disable();

    const request$ =
      value.id !== null
        ? this.api.update(
            this.resource,
            Number(value.id),
            payload,
          )
        : this.api.create(
            this.resource,
            payload,
          );

    request$
      .pipe(
        finalize(() => {
          this.saving = false;
          this.form.enable();
        }),
      )
      .subscribe({
        next: (saved: CatalogItem) => {
          this.dialogRef.close(saved ?? payload);
        },

        error: (error) => {
          console.error(
            '[RegionsDialog] Error guardando:',
            error,
          );

          this.showError(
            this.getErrorMessage(error),
          );
        },
      });
  }

  cancel(): void {
    if (this.saving) {
      return;
    }

    this.dialogRef.close();
  }

  private getErrorMessage(error: any): string {
    const backendMessage =
      error?.error?.message ||
      error?.error?.error ||
      error?.message;

    if (error?.status === 400) {
      return (
        backendMessage ||
        'Los datos ingresados no son válidos.'
      );
    }

    if (error?.status === 401) {
      return 'La sesión expiró o no pudo validarse.';
    }

    if (error?.status === 403) {
      return (
        backendMessage ||
        'No tiene permisos para realizar esta operación.'
      );
    }

    if (error?.status === 409) {
      return (
        backendMessage ||
        'El código ya pertenece a otro región.'
      );
    }

    if ([0, 502, 503, 504].includes(error?.status)) {
      return 'No fue posible conectar con el servidor.';
    }

    return (
      backendMessage ||
      'No fue posible guardar la región.'
    );
  }

  private showError(message: string): void {
    this.dialog.open(ConfirmDialogOkComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'No fue posible guardar',
        message,
        confirmText: 'Aceptar',
        color: 'warn',
        icon: 'error',
      },
    });
  }
}