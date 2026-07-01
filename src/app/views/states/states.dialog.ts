// src/app/views/states/states.dialog.ts


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
import { MatIconModule } from '@angular/material/icon';
import { StateService } from '../../services/state.service';
import { State } from '../../models/state';

@Component({
  standalone: true,
  selector: 'app-states-dialog',
  templateUrl: './states.dialog.html',
  styleUrls: ['./states.dialog.scss'],
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
export class StatesDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: StateService,
    private ref: MatDialogRef<StatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: State | null,
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

    const payload: State = {
      name: v.name,
    };

    if (v.id !== null) {
      payload.id = v.id;
    }

    const req = payload.id
      ? this.api.update(payload.id, payload)
      : this.api.save(payload);

    req.subscribe({
      next: (row: State) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
