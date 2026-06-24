// src/app/pages/roles/roles.dialog.ts
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

import { RoleService } from '../../services/role.service';
import { Role } from '../../models/role';

@Component({
  standalone: true,
  selector: 'app-role-dialog',
  templateUrl: './roles.dialog.html',
  styleUrls: ['./roles.dialog.scss'],
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
export class RoleDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: RoleService,
    private ref: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Role | null,
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
      next: (row: Role) => this.ref.close(row),
      error: () => {
        this.form.enable();
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
