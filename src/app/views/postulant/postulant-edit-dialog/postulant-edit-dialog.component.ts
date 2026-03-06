// C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\views\postulant\postulant-edit-dialog\postulant-edit-dialog.component.ts

import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';

import { firstValueFrom } from 'rxjs';
import { PostulantService } from '@app/services/postulant.service';
import { PreloadCatalogsService } from '@app/services/demand/preload-catalogs.service';
import { Postulant } from '@app/models/postulant';
import { DemandUtilsService } from '@app/services/demand/demand-utils.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';
import { ConfirmDialogYesNoComponent } from '@app/shared/confirm-dialog/confirm-dialog-yes-no.component';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

@Component({
  selector: 'app-postulant-edit-dialog',
  standalone: true,
  templateUrl: './postulant-edit-dialog.component.html',
  styleUrls: ['./postulant-edit-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class PostulantEditDialogComponent implements OnInit {
  form!: FormGroup;
  postulant!: any;

  communes: any[] = [];
  sexes: any[] = [];
  intPrev: any[] = [];
  convPrev: any[] = [];
  filteredConvPrev: any[] = [];
  edad: number | null = null;

  constructor(
    private fb: FormBuilder,
    private cdRef: ChangeDetectorRef,
    private postulantService: PostulantService,
    public utils: DemandUtilsService,
    private preload: PreloadCatalogsService,
    private dialogRef: MatDialogRef<PostulantEditDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { postulantId: number },
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.data?.postulantId) {
      this.dialogRef.close();
      return;
    }

    const catalogs = await firstValueFrom(this.preload.loadAll());
    this.communes = catalogs.communes;
    this.sexes = catalogs.sexes;
    this.intPrev = catalogs.intPrev;
    this.convPrev = catalogs.convPrev;

    this.postulant = await firstValueFrom(
      this.postulantService.getById(this.data.postulantId),
    );

    // Crear formulario
    this.form = this.fb.group({
      birthDate: [
        this.postulant.birthdate ? new Date(this.postulant.birthdate) : null,
      ],
      firstName: [this.postulant.firstName ?? '', Validators.required],
      secondName: [this.postulant.lastName ?? ''],
      firstLastName: [this.postulant.firstLastName ?? '', Validators.required],
      secondLastName: [this.postulant.secondLastName ?? ''],
      phone: [this.postulant.phone ?? ''],
      email: [
        this.postulant.email ?? '',
        [Validators.email, Validators.pattern(EMAIL_REGEX)],
      ],
      address: [this.postulant.address ?? ''],
      commune: [this.postulant.commune?.id ?? null],
      sex: [this.postulant.sex?.id ?? null],
      intPrev: [this.postulant.convPrev?.intPrev?.id ?? null],
      convPrev: [this.postulant.convPrev?.id ?? null],
    });
    // 🔥 Regla inicial
    if (this.form.value.intPrev) {
      this.aplicarReglaPrevisionLocal(this.form.value.intPrev);
      this.filterConvPrevByIntPrev(this.form.value.intPrev);
    }

    // 🎂 Edad inicial
    const birthDateInicial = this.form.get('birthDate')?.value;
    this.edad = birthDateInicial
      ? this.utils.getEdadDesdeFecha(birthDateInicial)
      : null;

    // 🎂 Recalcular edad
    this.form
      .get('birthDate')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((value) => {
        this.edad = value ? this.utils.getEdadDesdeFecha(value) : null;
      });

    // 🔄 Cambio de previsión
    this.form.get('intPrev')?.valueChanges.subscribe((v) => {
      this.filterConvPrevByIntPrev(v);
      this.aplicarReglaPrevisionLocal(v);
    });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;

    const { birthDate, ...raw } = this.form.value;

    const payload: Partial<Postulant> = {
      // 🔐 CONTEXTO DE SEGURIDAD (OBLIGATORIO)
      user: {
        id: this.postulant.user.id,
      },

      rut: this.postulant.rut,

      // 🧾 DATOS PERSONALES
      firstName: raw.firstName,
      lastName: raw.secondName,
      firstLastName: raw.firstLastName,
      secondLastName: raw.secondLastName,

      phone: raw.phone,
      email: raw.email,
      address: raw.address,

      birthdate: birthDate
        ? birthDate.toISOString().substring(0, 10)
        : undefined,

      // 📍 RELACIONES
      commune: raw.commune ? { id: raw.commune } : undefined,

      sex: raw.sex ? { id: raw.sex } : undefined,

      convPrev: raw.convPrev
        ? {
            id: raw.convPrev,
            intPrev: { id: raw.intPrev },
          }
        : undefined,
    };

    await firstValueFrom(
      this.postulantService.update(this.postulant.id, payload),
    );

    this.dialogRef.close(true);
  }

  hasPendingChanges(): boolean {
    return this.form?.dirty === true;
  }

  cancelar(): void {
    if (!this.hasPendingChanges()) {
      this.dialogRef.close(false);
      return;
    }

    this.dialog
      .open(ConfirmDialogYesNoComponent, {
        disableClose: true,
        data: {
          title: 'Cambios sin guardar',
          message: `Existen cambios sin guardar, si sales ahora, se perderán.`,
          icon: 'warning',
          confirmText: 'Salir',
          cancelText: 'Cancelar',
          color: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.dialogRef.close(false);
        }
      });
  }

  filterConvPrevByIntPrev(typeId: number): void {
    const control = this.form.get('convPrev');

    if (!typeId) {
      this.filteredConvPrev = [];
      control?.reset();
      control?.disable();
      return;
    }

    this.filteredConvPrev = this.convPrev.filter(
      (p: any) => Number(p.intPrev?.id) === Number(typeId),
    );

    if (!this.filteredConvPrev.length) {
      control?.reset();
      control?.disable();
      return;
    }

    control?.enable({ emitEvent: false });

    if (this.filteredConvPrev.some((p) => p.id === control?.value)) {
      return;
    }

    control?.setValue(this.filteredConvPrev[0].id, {
      emitEvent: false,
    });
  }

  private aplicarReglaPrevisionLocal(intPrevId: number): void {
    const ES_FONASA = 1; // 👈 usa el ID real de FONASA

    if (!intPrevId) return;

    if (Number(intPrevId) !== ES_FONASA) {
      this.dialog.open(ConfirmDialogOkComponent, {
        disableClose: true,
        data: {
          title: 'Previsión de Salud debe ser FONASA',
          message: `
        <strong>Importante<strong><br>
        El postulante <strong>no cumple con el requisito de previsión de salud</strong>
        para optar al tratamiento.<br><br>        
        La demanda debiera estar de la siguiente forma:<br>
          NO RELEVANTE / NO CORRESPONDE = POR PREVISION DE SALUD
          RESULTADO = HISTORICO
          ESTADO = NO ACEPTADO<br>
        La responsabilidad del ingreso recae en el profesional entrevistador.<br><br>
      `,
          icon: 'warning',
          confirmText: 'Entendido',
        },
      });
    }
  }
}
