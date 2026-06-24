// src/app/pages/results/results.dialog.ts

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
import { MatIconModule } from '@angular/material/icon';

import { ResultService } from '../../services/result.service';
import { Result } from '../../models/result';

@Component({
  standalone: true,
  selector: 'app-results-dialog',
  templateUrl: './results.dialog.html',
  styleUrls: ['./results.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class ResultsDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ResultService,
    private ref: MatDialogRef<ResultsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Result | null,
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

    const v = this.form.getRawValue() as { id: number | null; name: string };

    const payload: Result = {
      name: v.name,
    };

    if (v.id !== null) {
      payload.id = v.id;
    }

    const req = payload.id
      ? this.api.update(payload.id, payload)
      : this.api.save(payload);

    req.subscribe({
      next: (row: Result) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
