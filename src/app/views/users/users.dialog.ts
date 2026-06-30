// users.dialog.ts

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
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
  MatDialog,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { UsersService } from '../../services/users.service';
import { ProgramService } from '../../services/program.service';
import { RoleService } from '../../services/role.service';
import { Program } from '../../models/program';
import { Role } from '../../models/role';
import { User } from '../../models/user';
import { rutValidator } from '../../core/validator/rut.validator';
import { ConfirmDialogOkComponent } from '../../shared/confirm-dialog/confirm-dialog-ok.component';
import { AuthLoginService } from '../../services/auth.login.service';
import { UsersRelationsService } from '../../services/users-relations.service';

@Component({
  standalone: true,
  selector: 'app-users-dialog',
  templateUrl: './users.dialog.html',
  styleUrls: ['./users.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatIconModule, // 👁️ necesario para los íconos de visibilidad
    MatTooltipModule, // 👁️ necesario para los íconos de visibilidad
    MatSelectModule,
  ],
})
export class UsersDialogComponent implements OnInit {
  form!: FormGroup;
  programs: Program[] = [];
  roles: Role[] = [];
  hidePassword = true;
  public isEditing = false;
  private originalRut: string | null = null;
  private checkingRut = false;
  private usersCache: User[] = [];

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private programsService: ProgramService,
    private roleService: RoleService,
    private ref: MatDialogRef<UsersDialogComponent>,
    private dialog: MatDialog,
    private dialogOk: MatDialog,
    private authService: AuthLoginService,
    private relationsService: UsersRelationsService,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: User | null,
  ) {}

  ngOnInit(): void {
    this.isEditing = !!this.data?.id;

    this.usersService.listAll().subscribe((users) => {
      this.usersCache = users || [];
    });

    const userData = (
      this.isEditing
        ? { ...this.data, id: this.data?.id ?? null }
        : {
            id: null,
            firstName: '',
            secondName: '',
            firstLastName: '',
            secondLastName: '',
            email: '',
            username: '',
            password: '',
            rut: '',
            programs: [],
            roles: [],
          }
    ) as User;

    // 1️⃣ Formulario base
    this.form = this.fb.group({
      id: [userData.id],
      firstName: [userData.firstName, [Validators.required]],
      secondName: [userData.secondName],
      firstLastName: [userData.firstLastName],
      secondLastName: [userData.secondLastName],
      email: [userData.email, [Validators.required, Validators.email]],
      username: [userData.username],
      password: [
        '',
        this.isEditing ? [] : [Validators.required, Validators.minLength(6)],
      ],
      rut: [userData.rut, [Validators.required, rutValidator()]],
      // Programas se validan en save(): usuarios normales requieren programa,
      // pero ADMIN puede quedar sin programa activo.
      programs: [userData.programs?.map((p) => p.id) ?? []],
      roles: [userData.roles?.map((r) => r.id) ?? [], [Validators.required]],
    });

    // ⭐ GUARDAR RUT ORIGINAL (IMPORTANTE)
    if (this.isEditing) {
      this.originalRut = userData.rut;
    }

    // 2️⃣ Cargar catálogos
    this.loadPrograms();
    this.loadRoles();

    // 3️⃣ Cargar relaciones solo si edita
    if (this.isEditing) {
      this.usersService.getUserRoles(userData.id!).subscribe({
        next: (roles: Role[]) => {
          this.form.patchValue({ roles: roles.map((r) => r.id) });
        },
        error: (err) => this.handleError(err, 'roles'),
      });

      this.usersService.getUserPrograms(userData.id!).subscribe({
        next: (programs: Program[]) => {
          this.form.patchValue({ programs: programs.map((p) => p.id) });
        },
        error: (err) => this.handleError(err, 'programas'),
      });
    } else {
      setTimeout(() => {
        if (!this.isEditing) {
          this.form.reset({
            id: null,
            firstName: '',
            secondName: '',
            firstLastName: '',
            secondLastName: '',
            email: '',
            username: '',
            password: '',
            rut: '',
            programs: [],
            roles: [],
          });

          this.form.markAsPristine();
          this.form.markAsUntouched();

          console.log('[UsersDialog] 🧹 Nuevo usuario: formulario limpio');
        }
      });
    }
  }

  /** 🔹 Maneja errores sin cerrar sesión ni bloquear el layout */
  private handleError(
    err: HttpErrorResponse,
    tipo: 'roles' | 'programas',
  ): void {
    if (err.status === 403 || err.status === 404) {
      console.warn(
        `[UsersDialog] Usuario sin ${tipo} asociados o sin permiso (${err.status}).`,
      );

      // ✅ Mostramos aviso sin bloquear el resto
      this.dialogOk.open(ConfirmDialogOkComponent, {
        width: '420px',
        disableClose: false, // ✅ permite clic afuera o ESC
        hasBackdrop: true,
        autoFocus: false,
        data: {
          title: `Usuario sin ${tipo}`,
          message: `El usuario no tiene ${tipo} asociados.`,
          confirmText: 'Aceptar',
          color: 'accent',
          icon: 'info',
        },
      });
      return;
    }

    console.error(`[UsersDialog] ❌ Error cargando ${tipo}:`, err.message);
  }

  /** Cargar Programas disponibles */
  loadPrograms(): void {
    this.programsService.listAll().subscribe({
      next: (res: Program[]) => (this.programs = res || []),
      error: (err: HttpErrorResponse) =>
        console.error(
          '[UsersDialog] ❌ Error cargando programas:',
          err.message,
        ),
    });
  }

  /** Cargar Roles disponibles */
  loadRoles(): void {
    this.roleService.listAll().subscribe({
      next: (res: Role[]) => (this.roles = res || []),
      error: (err: HttpErrorResponse) =>
        console.error('[UsersDialog] ❌ Error cargando roles:', err.message),
    });
  }

  onRutFinalizado(): void {
    const control = this.form.get('rut');
    if (!control) return;

    control.updateValueAndValidity();
    control.markAsTouched();

    if (!control.valid) return;

    if (!this.isEditing) {
      this.checkRutDuplicate();
    }
  }

  autoFormatRut(event: Event): void {
    const input = event.target as HTMLInputElement;
    const control = this.form.get('rut');

    if (!control) return;

    let value = input.value.toUpperCase().replace(/[^0-9K]/g, '');

    if (value.length < 2) {
      input.value = value;
      return;
    }

    const body = value.slice(0, -1);
    const dv = value.slice(-1);

    let formatted = '';

    for (let i = body.length; i > 0; i -= 3) {
      const start = Math.max(i - 3, 0);
      formatted = body.substring(start, i) + (formatted ? '.' + formatted : '');
    }

    const formattedRut = `${formatted}-${dv}`;

    input.value = formattedRut;

    // ⚠ no emitir evento para no romper el cursor
    control.setValue(formattedRut, { emitEvent: false });
  }

  checkRutDuplicate(): void {
    if (this.isEditing) return;

    const control = this.form.get('rut');
    if (!control) return;

    const rut = control.value;
    if (!rut) return;

    // 🔹 variable auxiliar para validar
    const rutNormalizado = rut
      .replace(/\./g, '')
      .replace('-', '')
      .toUpperCase();

    const exists = this.usersCache.some((u) => {
      if (!u.rut) return false;

      const rutUser = u.rut.replace(/\./g, '').replace('-', '').toUpperCase();

      return rutUser === rutNormalizado;
    });

    if (exists) {
      control.setErrors({
        ...control.errors,
        rutDuplicado: true,
      });

      control.markAsTouched();

      this.showWarning(
        'El RUT ingresado ya está registrado en el sistema.',
        'RUT duplicado',
      );
    }
  }

  /** Guardar usuario (crear o actualizar) */
  async save(): Promise<void> {
    if (this.form.invalid) return;

    if (this.isEditing) {
      await this.updateUser();
    } else {
      await this.createUser();
    }
  }

  async createUser(): Promise<void> {
    const formValue = this.form.getRawValue();

    const selectedRoles = (formValue.roles || [])
      .map((id: number) => ({ id: Number(id) }))
      .filter((item: any) => !!item.id);

    const selectedPrograms = (formValue.programs || [])
      .map((id: number) => ({ id: Number(id) }))
      .filter((item: any) => !!item.id);

    if (!selectedRoles.length) {
      this.showWarning('Debe seleccionar al menos un rol.');
      return;
    }

    if (!this.isAdminSelected(selectedRoles) && !selectedPrograms.length) {
      this.showWarning('Debe seleccionar al menos un programa.');
      return;
    }

    const payload: any = {
      id: formValue.id,
      firstName: formValue.firstName,
      secondName: formValue.secondName,
      firstLastName: formValue.firstLastName,
      secondLastName: formValue.secondLastName,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
      rut: formValue.rut,
    };

    console.log('[UsersDialog] Payload crear usuario:', payload);

    const savedUser = await firstValueFrom(this.usersService.save(payload));

    const userId = savedUser.id!;

    await this.relationsService.updateRoles(userId, selectedRoles);
    await this.relationsService.updatePrograms(userId, selectedPrograms);

    console.log('✅ Usuario creado con roles y programas sincronizados');

    this.ref.close(true);
  }

  async updateUser(): Promise<void> {
    const formValue = this.form.getRawValue();

    const selectedRoles = (formValue.roles || [])
      .map((id: number) => ({ id: Number(id) }))
      .filter((item: any) => !!item.id);

    const selectedPrograms = (formValue.programs || [])
      .map((id: number) => ({ id: Number(id) }))
      .filter((item: any) => !!item.id);

    if (!selectedRoles.length) {
      this.showWarning('Debe seleccionar al menos un rol.');
      return;
    }

    if (!this.isAdminSelected(selectedRoles) && !selectedPrograms.length) {
      this.showWarning('Debe seleccionar al menos un programa.');
      return;
    }

    if (!formValue.password) {
      delete formValue.password;
    }

    const payload: User = {
      ...formValue,
      roles: selectedRoles as any,
      programs: selectedPrograms as any,
    };

    console.log('[UsersDialog] Payload actualizar usuario:', payload);

    const savedUser = await firstValueFrom(
      this.usersService.update(payload.id!, payload),
    );

    const userId = savedUser.id!;

    await this.relationsService.updateRoles(userId, selectedRoles);
    await this.relationsService.updatePrograms(userId, selectedPrograms);

    console.log('✅ Usuario actualizado con roles y programas sincronizados');

    this.ref.close(true);
  }

  private isAdminSelected(selectedRoles: Array<{ id: number }>): boolean {
    return selectedRoles.some((selectedRole) => {
      const role = this.roles.find(
        (item) => Number(item.id) === Number(selectedRole.id),
      );

      const roleName = String(role?.name ?? '').toUpperCase();

      return roleName === 'ADMIN' || roleName === 'ROLE_ADMIN';
    });
  }

  cancel(): void {
    this.ref.close();
  }

  autoFormatAndValidateRut(event: Event): void {
    const input = event.target as HTMLInputElement;
    const control = this.form.get('rut');
    if (!control) return;

    // 🧹 limpiar error de duplicado al volver a escribir
    if (control.hasError('rutDuplicado')) {
      const errors = { ...(control.errors || {}) };
      delete errors['rutDuplicado'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }

    // ... resto de tu lógica
  }

  generarUsername(): void {
    const firstName = this.form.get('firstName')?.value;
    const secondName = this.form.get('secondName')?.value;
    const lastName = this.form.get('firstLastName')?.value;

    const usernameControl = this.form.get('username');
    const emailControl = this.form.get('email');

    if (!firstName || !lastName || !usernameControl) return;

    const clean = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const firstInitial = clean(firstName)[0];
    const secondInitial = secondName ? clean(secondName)[0] : '';
    const last = clean(lastName);

    const username = firstInitial + secondInitial + last;

    usernameControl.setValue(username);

    /** generar correo si está vacío */

    if (emailControl && !emailControl.value) {
      const email = username + '@redsalud.gob.cl';

      emailControl.setValue(email);
    }
  }

  completarCorreo(): void {
    const control = this.form.get('email');

    let value = control?.value;

    if (!value) return;

    value = value.trim().toLowerCase();

    if (!value.includes('@')) {
      value = value + '@redsalud.gob.cl';
    }

    control?.setValue(value);
  }

  showWarning(message: string, title = 'Validación requerida') {
    this.dialog.open(ConfirmDialogOkComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title,
        message,
        icon: 'warning',
        color: 'warn',
        confirmText: 'Aceptar',
      },
    });
  }
}
