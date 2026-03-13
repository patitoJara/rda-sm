// src/app/views/transfer/transfer.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RegisterService } from '@app/services/register.service';
import { ProgramService } from '@app/services/program.service';
import { TokenService } from '@app/services/token.service';
import { firstValueFrom } from 'rxjs';
import { MatChipsModule } from '@angular/material/chips';
import { UsersService } from '@app/services/users.service';
import { DemandCloneService } from '@app/services/demand/demand-clone.service';
import { User } from '@app/models/user';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RegisterSubstanceService } from '@app/services/register-substance.service';
import { MailService } from '@app/core/services/mail.service';
import { Program } from '@app/models/program';
import { Role } from '@app/models/role';

interface Step {
  id: number;
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-transfer',
  standalone: true,
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
  ],
})
export class TransferComponent {
  private registerService = inject(RegisterService);
  private programService = inject(ProgramService);
  private tokenService = inject(TokenService);
  private fb = inject(FormBuilder);
  private demandCloneService = inject(DemandCloneService);
  private usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  private registerSubstanceService = inject(RegisterSubstanceService);
  private mailService = inject(MailService);

  loadingUsers = false;
  loading = false;
  transferCompleted = false;

  form = this.fb.group({
    rut: ['', Validators.required],
  });

  registers: any[] = [];
  selectedRegister: any = null;

  currentProgram: any = null;
  availablePrograms: any[] = [];
  selectedProgramId: number | null = null;

  notificationEmails: string[] = [];
  userFullName = '';

  availableDestinationUsers: User[] = [];
  selectedDestinationUserId: number | null = null;

  steps: Step[] = [
    { id: 1, title: 'Buscar RUT', completed: false },
    { id: 2, title: 'Seleccionar Registro', completed: false },
    { id: 3, title: 'Revisión Clínica', completed: false },
    { id: 4, title: 'Programa Destino', completed: false },
    { id: 5, title: 'Profesional Destino', completed: false },
    { id: 6, title: 'Confirmación', completed: false },
    { id: 7, title: 'Ejecución', completed: false },
  ];

  currentStep = 1;

  /* ================= PROGRESO ================= */

  get progress(): number {
    return Math.round(((this.currentStep - 1) / (this.steps.length - 1)) * 100);
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length) {
      this.steps[this.currentStep - 1].completed = true;
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      // 🔹 Si retrocedes al PASO 1 → limpia todo el flujo
      if (this.currentStep === 2) {
        this.selectedRegister = null;
        this.currentProgram = null;
        this.availablePrograms = [];
        this.selectedProgramId = null;
        this.availableDestinationUsers = [];
        this.selectedDestinationUserId = null;
        this.notificationEmails = [];
        this.transferCompleted = false;

        // también reinicia pasos completados
        this.steps.forEach((step) => (step.completed = false));
      }

      // 🔹 Retrocede desde Paso 5
      if (this.currentStep === 5) {
        this.selectedDestinationUserId = null;
      }

      // 🔹 Retrocede desde Paso 4
      if (this.currentStep === 4) {
        this.selectedProgramId = null;
        this.availableDestinationUsers = [];
        this.selectedDestinationUserId = null;
      }

      this.currentStep--;
    }
  }

  /* ================= PASO 1 ================= */

  async onRutFinalizado(): Promise<void> {
    if (this.form.invalid) return;

    const rut = this.form.get('rut')?.value;
    if (!rut) return;

    this.loading = true;

    try {
      const response = await firstValueFrom(
        this.registerService.getAllByRut(rut),
      );

      const allRegisters = response || [];

      const activeProgramId = Number(this.tokenService.getActiveProgramId());

      // 🔹 Filtrar por programa activo
      const filtered = allRegisters.filter(
        (r: any) => Number(r.program?.id) === activeProgramId,
      );

      if (filtered.length === 0) {
        this.dialog.open(ConfirmDialogOkComponent, {
          width: '620px',
          disableClose: true,
          data: {
            title: 'Sin resultados',
            message:
              'No existen registros para este RUT en el programa activo.',
            icon: 'search_off',
            confirmText: 'OK',
          },
        });
        return;
      }

      // 🔥 AQUÍ ENRIQUECEMOS LOS REGISTROS
      this.registers = await Promise.all(
        filtered.map((r) => firstValueFrom(this.registerService.getById(r.id))),
      );

      this.nextStep();
    } finally {
      this.loading = false;
    }
  }

  /* ================= PASO 2 ================= */

  async selectRegister(register: any): Promise<void> {
    this.selectedRegister = register;
    this.currentProgram = register.program;

    // 🔥 Cargar sustancias
    const substances = await firstValueFrom(
      this.registerSubstanceService.searchByRegisterId(register.id),
    );
    this.selectedRegister.registerSubstances = substances;

    // 🔥 Cargar usuario completo
    if (register.user?.id) {
      const userFull = await firstValueFrom(
        this.usersService.findById(register.user.id),
      );
      this.selectedRegister.user = userFull;
    }

    const programs = await firstValueFrom(this.programService.listAll());

    this.availablePrograms = programs.filter(
      (p: any) => p.id !== this.currentProgram?.id,
    );

    const profile = this.tokenService.getUserProfile();
    this.userFullName = profile?.fullName || 'Funcionario';

    this.nextStep();
  }

  /* ================= PASO 4 ================= */

  async onProgramSelected(id: number) {
    this.selectedProgramId = id;
    await this.loadUsersByProgram(id);
  }

  private async loadUsersByProgram(programId: number) {
    this.loadingUsers = true;

    try {
      const relations = await firstValueFrom(
        this.usersService.getAllUsersPrograms(), // 👈 UN SOLO LLAMADO
      );

      const filtered = relations
        .filter((rel: any) => rel.program?.id === programId)
        .map((rel: any) => rel.user);

      this.availableDestinationUsers = filtered;
    } finally {
      this.loadingUsers = false;
    }
  }

  /* ================= META STEPPER ================= */

  getStepMeta(stepId: number): string | null {
    switch (stepId) {
      case 1:
        return this.form.get('rut')?.value || null;

      case 2:
        return this.currentProgram?.name || null;

      case 3:
        return this.selectedRegister
          ? `${this.selectedRegister.postulant?.firstName} ${this.selectedRegister.postulant?.lastName}`
          : null;

      case 4:
        return this.selectedProgramName || null;

      case 5:
        return this.getSelectedDestinationUserName();

      case 6:
        return this.transferCompleted ? 'Transferencia realizada' : null;

      default:
        return null;
    }
  }

  get selectedProgramName(): string {
    if (!this.selectedProgramId) return '';
    const program = this.availablePrograms.find(
      (p) => p.id === this.selectedProgramId,
    );
    return program?.name || '';
  }

  /* ================= CONFIRMACIONES ================= */

  async confirmDestinationProgram() {
    if (!this.selectedProgramId) return;
    await this.loadNotificationEmails();
    this.nextStep();
  }

  async confirmDestinationUser() {
    if (!this.selectedDestinationUserId) return;
    this.nextStep();
  }

  /* ================= EJECUCIÓN ================= */

  async executeTransfer(): Promise<void> {
    if (
      !this.selectedProgramId ||
      !this.selectedRegister ||
      !this.selectedDestinationUserId
    ) {
      return;
    }

    try {
      const transferComment = this.buildTransferComment();
      const currentDescription = this.selectedRegister.description ?? '';

      let updatedDescription = currentDescription;

      // 🔎 Evitar duplicar transferencia
      if (!currentDescription.includes('TRANSFERENCIA')) {
        updatedDescription = currentDescription
          ? `${currentDescription.trim()}\n\n${transferComment.trim()}`
          : transferComment.trim();
      }

      console.log('Length:', updatedDescription.length);
      console.log('Raw:', JSON.stringify(updatedDescription));

      // 🔥 IMPORTANTE: enviar TODO el objeto porque es PUT
      const payload = {
        ...this.selectedRegister,

        // 🔄 Solo cambiamos estos 3 campos
        program: { id: this.selectedProgramId },
        user: { id: this.selectedDestinationUserId },
        description: updatedDescription,
      };

      console.log('Payload final enviado:', payload);

      await firstValueFrom(
        this.registerService.update(this.selectedRegister.id, payload),
      );

      // 🔄 Recargar desde backend para asegurar consistencia
      this.selectedRegister = await firstValueFrom(
        this.registerService.getById(this.selectedRegister.id),
      );

      /* ===============================
       📧 ENVIAR CORREOS DE NOTIFICACIÓN
       =============================== */

      if (this.notificationEmails.length) {
        const subject = 'Transferencia de Registro Clínico';

        const message = `
Se ha realizado una transferencia de registro.

Paciente:
${this.selectedRegister.postulant?.firstName || ''} ${this.selectedRegister.postulant?.lastName || ''}

Programa origen:
${this.currentProgram?.name}

Programa destino:
${this.selectedProgramName}

Profesional asignado:
${this.getSelectedDestinationUserName()}

Fecha:
${new Date().toLocaleString('es-CL')}
`;

        for (const email of this.notificationEmails) {
          await firstValueFrom(
            this.mailService.send({
              to: email,
              subject,
              message,
            }),
          );
        }
      }

      /* =============================== */

      this.transferCompleted = true;
      this.nextStep(); // Marca 6 y pasa a 7

      // 🔥 Marca también el 7 como completado
      this.steps[this.currentStep - 1].completed = true;
    } catch (error) {
      console.error('❌ Error ejecutando transferencia', error);
    }
  }

  /* ================= UTILIDADES ================= */

  private buildTransferComment(): string {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CL');
    const hora = now.toLocaleTimeString('es-CL');

    return `
--- TRANSFERENCIA ---
Fecha: ${fecha} ${hora}
Desde programa: ${this.currentProgram?.name}
Usuario anterior: ${this.originUserDisplayName}
Hacia programa: ${this.selectedProgramName}
Asignado a: ${this.getSelectedDestinationUserName()}
----------------------`;
  }

  private getSelectedDestinationUserName(): string | null {
    if (!this.selectedDestinationUserId) return null;

    const user = this.availableDestinationUsers.find(
      (u) => u.id === this.selectedDestinationUserId,
    );

    if (!user) return null;

    return this.getUserDisplayName(user);
  }

  getUserDisplayName(user: User): string {
    return [
      user.firstName,
      user.secondName,
      user.firstLastName,
      user.secondLastName,
    ]
      .filter((p) => !!p && p.trim() !== '')
      .join(' ');
  }

  get originUserDisplayName(): string {
    const user = this.selectedRegister?.user;
    if (!user) return 'No registrado';

    return [
      user.firstName,
      user.secondName,
      user.firstLastName,
      user.secondLastName,
    ]
      .filter((p) => !!p && p.trim() !== '')
      .join(' ');
  }

  autoFormatRut(event: any): void {
    let value = event.target.value.replace(/[^0-9kK]/g, '');

    if (value.length > 1) {
      const body = value.slice(0, -1);
      const dv = value.slice(-1);
      value = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
    }

    this.form.get('rut')?.setValue(value, { emitEvent: false });
  }

  reiniciarTransferencia(): void {
    this.form.reset();

    this.registers = [];
    this.selectedRegister = null;
    this.currentProgram = null;
    this.availablePrograms = [];
    this.selectedProgramId = null;
    this.availableDestinationUsers = [];
    this.selectedDestinationUserId = null;
    this.notificationEmails = [];

    this.transferCompleted = false;
    this.loading = false;

    this.steps.forEach((step) => (step.completed = false));
    this.currentStep = 1;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadNotificationEmails(): Promise<void> {
    const originProgramId = this.currentProgram?.id;
    const destinationProgramId = this.selectedProgramId;

    if (!originProgramId || !destinationProgramId) return;

    const relations = await firstValueFrom(
      this.usersService.getAllUsersPrograms(),
    );

    const emails = new Set<string>();

    relations.forEach((rel: any) => {
      const programId = rel.program?.id;
      const user = rel.user;

      if (programId === originProgramId || programId === destinationProgramId) {
        if (user?.email) {
          emails.add(user.email);
        }
      }
    });

    this.notificationEmails = Array.from(emails);
  }

  get principalSubstance(): string | null {
    if (!this.selectedRegister?.registerSubstances) return null;

    const principal = this.selectedRegister.registerSubstances.find(
      (s: any) => s.level === 'Principal',
    );

    return principal?.substance?.name ?? null;
  }

  get secondarySubstances(): string {
    if (!this.selectedRegister?.registerSubstances) return '';

    return this.selectedRegister.registerSubstances
      .filter((s: any) => s.level === 'Secundaria')
      .map((s: any) => s.substance?.name)
      .join(', ');
  }

  async sendTransferNotifications() {
    const subject = 'Transferencia de Demandante';

    const message = `
Se ha realizado una transferencia de registro clínico.

Programa origen: ${this.currentProgram?.name}
Programa destino: ${this.selectedProgramName}

Usuario asignado: ${this.getSelectedDestinationUserName()}

Fecha: ${new Date().toLocaleString('es-CL')}
`;

    for (const email of this.notificationEmails) {
      await firstValueFrom(
        this.mailService.send({
          to: email,
          subject,
          message,
        }),
      );
    }
  }
}
