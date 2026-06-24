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
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

import { ConvPrevService } from '../../services/conv-prev.service';
import { ConvPrev } from '../../models/conv-prev';
import { IntPrevService } from '../../services/int-prev.service';
import { IntPrev } from '../../models/int-prev';

@Component({
  standalone: true,
  selector: 'app-conv-prev-dialog',
  templateUrl: './conv-prev.dialog.html',
  styleUrls: ['./conv-prev.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
  ],
})
export class ConvPrevDialogComponent implements OnInit {
  form!: FormGroup;
  intPrevList: IntPrev[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ConvPrevService,
    private intPrevApi: IntPrevService,
    private ref: MatDialogRef<ConvPrevDialogComponent>,

    // ⭐⭐ CORRECTO: recibimos row y el intPrevId
    @Inject(MAT_DIALOG_DATA)
    public data: { row: ConvPrev | null; intPrevId: number | null },
  ) {}

  ngOnInit(): void {
    const row = this.data.row;

    // ⭐ CREAR FORM
    this.form = this.fb.group({
      id: [row?.id ?? null],
      name: [row?.name ?? '', [Validators.required, Validators.maxLength(120)]],
      intPrevId: [
        row?.intPrev?.id ?? this.data.intPrevId, // ⭐ SIEMPRE LLEGA
        Validators.required,
      ],
    });

    // ⭐ Cargar tipos de previsión
    this.intPrevApi.getAll().subscribe((res) => {
      this.intPrevList = res;

      // ⭐ Forzar re-render para nueva previsión
      const id = this.form.get('intPrevId')?.value;
      if (id && !this.form.get('intPrevId')?.dirty) {
        this.form.get('intPrevId')?.setValue(id);
      }
    });
  }

  // ⭐ Mostrar texto en el título
  getIntPrevName(): string {
    const id = this.form.get('intPrevId')?.value;
    if (!id || this.intPrevList.length === 0) return '';
    return this.intPrevList.find((x) => x.id === id)?.name ?? '';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.form.disable();

    const v = this.form.getRawValue() as {
      id: number | null;
      name: string;
      intPrevId: number;
    };

    const payload: any = {
      name: v.name,
      intPrev: { id: v.intPrevId },
    };

    if (v.id !== null) {
      payload.id = v.id;
    }

    const req = v.id ? this.api.update(v.id, payload) : this.api.save(payload);

    req.subscribe({
      next: (row: ConvPrev) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }

  cancel() {
    this.ref.close();
  }
}
