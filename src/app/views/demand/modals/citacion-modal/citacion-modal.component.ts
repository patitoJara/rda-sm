import { Component, Inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { DemandUtilsService } from '@app/services/demand/demand-utils.service';

@Component({
  selector: 'app-citacion-modal',
  standalone: true,
  templateUrl: './citacion-modal.component.html',
  styleUrls: ['./citacion-modal.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
  ],
})
export class CitacionModalComponent {
  form: FormGroup;

  professions: any[] = [];
  states: any[] = [];

  constructor(
    private fb: FormBuilder,
    public utils: DemandUtilsService,
    private dialogRef: MatDialogRef<CitacionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.professions = data?.professions ?? [];
    this.states = data?.states ?? [];

    const citacion = data?.citacion ?? null;

    this.form = this.fb.group({
      date: [citacion?.date_attention ?? null, Validators.required],
      hour: [
  citacion?.hour_attention ?? null,
  [
    Validators.required,
    Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
  ]
],
      profession: [citacion?.profession?.id ?? null, Validators.required],
      professional: [citacion?.full_name ?? '', Validators.required],
      state: [citacion?.state ?? 'AGENDADO', Validators.required],
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    if (this.form.invalid) return;

    const { date, hour, profession, professional, state } = this.form.value;

    const movement = {
      id: this.data?.citacion?.id ?? null,
      profession: this.professions.find((p) => p.id === profession),
      full_name: professional,
      date_attention: formatDate(date, 'yyyy-MM-dd', 'en-CL'),
      hour_attention: hour,
      state: state,
      isPersisted: this.data?.citacion?.isPersisted ?? false,
      __isNew: !this.data?.citacion?.id,
      __isDirty: true,
    };

    this.dialogRef.close(movement);
  }

  get estadoIcon(): string {
    switch (this.data?.citacion?.state) {
      case 'SE_PRESENTO':
        return 'check_circle';
      case 'NO_SE_PRESENTO':
        return 'person_off';
      case 'CANCELA_PROGRAMA':
        return 'cancel';
      case 'AGENDADO':
      default:
        return 'schedule';
    }
  }

}
