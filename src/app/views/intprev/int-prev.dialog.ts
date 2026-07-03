// ============================================================
// ✅ INT PREV DIALOG
// Crear / editar tipo de previsión
// ============================================================

import { Component, Inject, OnInit } from '@angular/core';
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

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { IntPrev } from '../../models/int-prev';
import { IntPrevService } from '../../services/int-prev.service';

@Component({
  standalone: true,
  selector: 'app-int-prev-dialog',
  templateUrl: './int-prev.dialog.html',
  styleUrls: ['./int-prev.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class IntPrevDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: IntPrevService,
    private readonly ref: MatDialogRef<IntPrevDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: IntPrev | null,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [this.data?.id ?? null],
      name: [
        this.data?.name ?? '',
        [Validators.required, Validators.maxLength(120)],
      ],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.form.disable();

    const raw = this.form.getRawValue();

    const payload: IntPrev = {
      ...(this.data ?? {}),
      id: raw.id ?? undefined,
      name: String(raw.name ?? '').trim(),
    };

    const req = payload.id
      ? this.api.update(Number(payload.id), payload)
      : this.api.save(payload);

    req.subscribe({
      next: (row: IntPrev) => this.ref.close(row),
      error: (err) => {
        console.error('[IntPrevDialog] Error guardando tipo de previsión:', err);
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}