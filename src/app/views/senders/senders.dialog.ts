// src/app/pages/senders/senders.dialog.ts

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
import { SenderService } from '../../services/sender.service';
import { Sender } from '../../models/sender';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-senders-dialog',
  templateUrl: './senders.dialog.html',
  styleUrls: ['./senders.dialog.scss'],
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
export class SendersDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: SenderService,
    private ref: MatDialogRef<SendersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Sender | null,
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

    const payload: any = {
      name: v.name,
    };

    if (v.id !== null) {
      payload.id = v.id;
    }

    const req = v.id ? this.api.update(v.id, payload) : this.api.save(payload);

    req.subscribe({
      next: (row: Sender) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
