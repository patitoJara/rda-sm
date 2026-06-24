// src/app/pages/communes/program.dialog.ts
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
import { ProgramService } from '../../services/program.service';
import { Program } from '../../models/program';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

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
    MatCardModule,
    MatSelectModule,
    MatIconModule,
  ],
})
export class ProgramDialogComponent implements OnInit {
  form!: FormGroup;

  uttOptions = ['ADOLESCENTE', 'ADULTO'];
  typeOptions = ['RESIDENCIAL', 'AMBULATORIO'];

  c1Options = [
    'NINGUNA',
    'POBLACION GENERAL',
    'ESPECIFICO MUJERES',
    'POBLACION INFRACTORA DE LEY',
    'POBLACION ESPECIFICO MUJERES',
  ];

  c2Options = [
    'NINGUNA',
    'POBLACION GENERAL',
    'ESPECIFICO MUJERES',
    'POBLACION INFRACTORA DE LEY',
    'POBLACION ESPECIFICO MUJERES',
  ];

  constructor(
    private fb: FormBuilder,
    private api: ProgramService,
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

      utt: [this.data?.utt ?? '', Validators.required],
      type: [this.data?.type ?? '', Validators.required],

      c1: [this.data?.c1 ?? null],
      c2: [this.data?.c2 ?? null],

      address: [this.data?.address ?? ''],
      cellphone: [this.data?.cellphone ?? ''],
      email: [this.data?.email ?? ''],
      city: [this.data?.city ?? ''],
      description: [this.data?.description ?? ''],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.form.disable();

    const raw = this.form.getRawValue();

    const payload: any = {
      ...raw,
      c1: raw.c1 || null,
      c2: raw.c2 || null,
    };

    const req = payload.id
      ? this.api.update(payload.id, payload)
      : this.api.save(payload);

    req.subscribe({
      next: (row: Program) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
