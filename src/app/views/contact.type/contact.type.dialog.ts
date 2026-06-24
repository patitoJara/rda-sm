// src/app/pages/contact.types/contact.types.dialog.ts
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

import { ContactTypeService } from '../../services/contact.type.service';
import { ContactType } from '../../models/contact.type';

@Component({
  standalone: true,
  selector: 'app-contact-types-dialog',
  templateUrl: 'contact.type.dialog.html',
  styleUrls: ['contact.type.dialog.scss'],
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
export class contacttypesDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ContactTypeService,
    private ref: MatDialogRef<contacttypesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContactType | null,
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
      next: (row: ContactType) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }
  cancel(): void {
    this.ref.close();
  }
}
