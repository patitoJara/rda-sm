import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Observable, catchError, finalize, forkJoin, map, of } from 'rxjs';

import { Program } from '../../models/program';
import { ProgramProfessional } from '../../models/program-professional.model';
import { Role } from '../../models/role';
import { User } from '../../models/user';
import { ProgramProfessionalService } from '../../services/program-professional.service';
import { ProgramService } from '../../services/program.service';
import { UsersService } from '../../services/users.service';

type ContactSource = 'USER' | 'PROFESSIONAL';

interface DirectoryContact {
  key: string;
  source: ContactSource;
  id: number;
  name: string;
  email: string;
  phone: string;
  detail: string;
  roles: string[];
  programIds: number[];
  active: boolean;
}

interface DirectoryProgram {
  program: Program;
  contacts: DirectoryContact[];
  emails: string[];
  userCount: number;
  professionalCount: number;
}

interface UserProgramRelation {
  userId: number | null;
  programId: number | null;
}

@Component({
  standalone: true,
  selector: 'app-directory-communications',
  templateUrl: './directory-communications.component.html',
  styleUrls: ['./directory-communications.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
})
export class DirectoryCommunicationsComponent implements OnInit {
  private readonly programService = inject(ProgramService);
  private readonly professionalService = inject(ProgramProfessionalService);
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(MatSnackBar);

  loading = false;
  errorMessage: string | null = null;

  programs: Program[] = [];
  contacts: DirectoryContact[] = [];
  directory: DirectoryProgram[] = [];
  institutionalContacts: DirectoryContact[] = [];

  selectedEmails = new Set<string>();

  readonly filtersForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    programId: new FormControl<number | null>(null),
    role: new FormControl('', { nonNullable: true }),
    onlyActive: new FormControl(true, { nonNullable: true }),
    missingEmail: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.filtersForm.valueChanges.subscribe(() => this.rebuildDirectory());
    this.loadDirectory();
  }

  get visiblePrograms(): DirectoryProgram[] {
    return this.directory;
  }

  get selectedEmailList(): string[] {
    return [...this.selectedEmails].sort((a, b) => a.localeCompare(b));
  }

  get availableRoles(): string[] {
    const roles = new Set<string>();

    this.contacts.forEach((contact) => {
      contact.roles.forEach((role) => roles.add(role));
    });

    return [...roles].sort((a, b) => a.localeCompare(b));
  }

  get contactCount(): number {
    return this.visiblePrograms.reduce(
      (total, item) => total + item.contacts.length,
      0,
    );
  }

  get emailCount(): number {
    const emails = new Set<string>();

    this.visiblePrograms.forEach((item) => {
      item.emails.forEach((email) => emails.add(email));
    });

    this.institutionalContacts.forEach((contact) => {
      if (contact.email) {
        emails.add(contact.email);
      }
    });

    return emails.size;
  }

  loadDirectory(): void {
    this.loading = true;
    this.errorMessage = null;

    forkJoin({
      programs: this.loadPrograms(),

      professionals: this.professionalService
        .getAll()
        .pipe(catchError(() => of([] as ProgramProfessional[]))),

      users: this.usersService
        .listAll()
        .pipe(catchError(() => of([] as User[]))),

      relations: this.usersService
        .getAllUsersPrograms()
        .pipe(catchError(() => of([] as any[]))),
    })
      .pipe(
        map((result) => ({
          ...result,
          relations: this.normalizeRelations(result.relations),
        })),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: ({ programs, professionals, users, relations }) => {
          this.programs = programs
            .filter((program) => program.active !== false && !program.deletedAt)
            .sort((a, b) => a.name.localeCompare(b.name));

          this.loadUserRoles(users, professionals, relations);
        },
        error: () => {
          this.errorMessage =
            'No fue posible cargar el directorio institucional.';
        },
      });
  }

  clearFilters(): void {
    this.filtersForm.reset({
      q: '',
      programId: null,
      role: '',
      onlyActive: true,
      missingEmail: false,
    });
  }

  toggleEmail(email: string): void {
    const normalized = this.normalizeEmail(email);

    if (!normalized) {
      return;
    }

    if (this.selectedEmails.has(normalized)) {
      this.selectedEmails.delete(normalized);
    } else {
      this.selectedEmails.add(normalized);
    }
  }

  isEmailSelected(email: string): boolean {
    return this.selectedEmails.has(this.normalizeEmail(email));
  }

  selectProgramEmails(item: DirectoryProgram): void {
    item.emails.forEach((email) => this.selectedEmails.add(email));
    this.notify(`${item.emails.length} correo(s) agregados.`);
  }

  selectAllVisibleEmails(): void {
    this.visiblePrograms.forEach((item) => {
      item.emails.forEach((email) => this.selectedEmails.add(email));
    });

    this.institutionalContacts.forEach((contact) => {
      if (contact.email) {
        this.selectedEmails.add(contact.email);
      }
    });

    this.notify('Correos visibles agregados a la selección.');
  }

  clearSelection(): void {
    this.selectedEmails.clear();
  }

  copyEmail(email: string): void {
    const normalized = this.normalizeEmail(email);

    if (!normalized) {
      return;
    }

    this.copyText(normalized, 'Correo copiado.');
  }

  copySelectedEmails(): void {
    const emails = this.selectedEmailList;

    if (!emails.length) {
      this.notify('No hay correos seleccionados.');
      return;
    }

    this.copyText(emails.join('; '), 'Correos seleccionados copiados.');
  }

  copyProgramEmails(item: DirectoryProgram): void {
    if (!item.emails.length) {
      this.notify('Este programa no tiene correos disponibles.');
      return;
    }

    this.copyText(
      item.emails.join('; '),
      `Correos de ${item.program.name} copiados.`,
    );
  }

  openMailClient(): void {
    const emails = this.selectedEmailList;

    if (!emails.length) {
      this.notify('Seleccione al menos un correo.');
      return;
    }

    window.location.href = `mailto:?bcc=${encodeURIComponent(
      emails.join(';'),
    )}`;
  }

  exportDirectoryExcel(): void {
    const workbook = XLSX.utils.book_new();

    const generatedAt = new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const summaryRows = [
      { Indicador: 'Fecha de generación', Valor: generatedAt },
      { Indicador: 'Programas visibles', Valor: this.visiblePrograms.length },
      { Indicador: 'Contactos asociados', Valor: this.contactCount },
      { Indicador: 'Correos disponibles', Valor: this.emailCount },
    ];

    const institutionalRows = this.institutionalContacts.map((contact) => ({
      Nombre: contact.name,
      'Rol o cargo': contact.detail,
      Correo: contact.email || '',
      Teléfono: contact.phone || '',
    }));

    const userRows: Array<Record<string, string>> = [];
    const professionalRows: Array<Record<string, string>> = [];
    const programRows: Array<Record<string, string | number>> = [];

    this.visiblePrograms.forEach((item) => {
      programRows.push({
        Programa: item.program.name,
        'Correo institucional': item.program.email || '',
        Teléfono: item.program.phone || '',
        Dirección: item.program.address || '',
        Usuarios: item.userCount,
        Facultativos: item.professionalCount,
        'Correos disponibles': item.emails.length,
      });

      this.getProgramUsers(item).forEach((contact) => {
        userRows.push({
          Programa: item.program.name,
          Nombre: contact.name,
          'Rol o cargo': contact.detail,
          Correo: contact.email || '',
          Teléfono: contact.phone || '',
        });
      });

      this.getProgramProfessionals(item).forEach((contact) => {
        professionalRows.push({
          Programa: item.program.name,
          Nombre: contact.name,
          Profesión: contact.detail,
          Correo: contact.email || '',
          Teléfono: contact.phone || '',
        });
      });
    });

    const appendSheet = (
      rows: Array<Record<string, unknown>>,
      sheetName: string,
      widths: number[],
    ): void => {
      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet['!cols'] = widths.map((width) => ({
        wch: width,
      }));

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    };

    appendSheet(summaryRows, 'Resumen', [25, 25]);

    appendSheet(
      institutionalRows.length
        ? institutionalRows
        : [{ Nombre: '', 'Rol o cargo': '', Correo: '', Teléfono: '' }],
      'Contactos transversales',
      [35, 28, 40, 20],
    );

    appendSheet(
      userRows.length
        ? userRows
        : [{
            Programa: '',
            Nombre: '',
            'Rol o cargo': '',
            Correo: '',
            Teléfono: '',
          }],
      'Usuarios por programa',
      [45, 35, 28, 40, 20],
    );

    appendSheet(
      professionalRows.length
        ? professionalRows
        : [{
            Programa: '',
            Nombre: '',
            Profesión: '',
            Correo: '',
            Teléfono: '',
          }],
      'Facultativos',
      [45, 35, 25, 40, 20],
    );

    appendSheet(
      programRows,
      'Programas',
      [50, 40, 20, 45, 12, 14, 18],
    );

    const today = new Date();
    const fileDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    XLSX.writeFile(
      workbook,
      `directorio-comunicaciones-${fileDate}.xlsx`,
    );
  }
  printDirectory(): void {
    const generatedAt = new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());

    const institutionalHtml = this.institutionalContacts.length
      ? `
        <section class="report-section">
          <h2>Contactos transversales</h2>
          <p class="section-description">
            Administración y supervisión, independientemente del programa.
          </p>

          <div class="contact-grid">
            ${this.institutionalContacts
              .map(
                (contact) => `
                  <article class="contact-card">
                    <strong>${this.escapeHtml(contact.name)}</strong>
                    <span>${this.escapeHtml(contact.detail)}</span>
                    ${
                      contact.email
                        ? `<small>${this.escapeHtml(contact.email)}</small>`
                        : '<small>Sin correo registrado</small>'
                    }
                  </article>
                `,
              )
              .join('')}
          </div>
        </section>
      `
      : '';

    const programsHtml = this.visiblePrograms
      .map((item) => {
        const users = this.getProgramUsers(item);
        const professionals = this.getProgramProfessionals(item);

        const usersHtml = users.length
          ? `
            <div class="contact-group">
              <h3>Usuarios con acceso al sistema</h3>
              <p>${users.length} usuario(s) asociado(s)</p>

              <div class="contact-grid">
                ${users
                  .map(
                    (contact) => `
                      <article class="contact-card">
                        <strong>${this.escapeHtml(contact.name)}</strong>
                        <span>${this.escapeHtml(contact.detail)}</span>
                        ${
                          contact.email
                            ? `<small>${this.escapeHtml(contact.email)}</small>`
                            : '<small>Sin correo registrado</small>'
                        }
                      </article>
                    `,
                  )
                  .join('')}
              </div>
            </div>
          `
          : '';

        const professionalsHtml = professionals.length
          ? `
            <div class="contact-group">
              <h3>Facultativos del programa</h3>
              <p>${professionals.length} facultativo(s) asociado(s)</p>

              <div class="contact-grid">
                ${professionals
                  .map(
                    (contact) => `
                      <article class="contact-card">
                        <strong>${this.escapeHtml(contact.name)}</strong>
                        <span>${this.escapeHtml(contact.detail)}</span>
                        ${
                          contact.email
                            ? `<small>${this.escapeHtml(contact.email)}</small>`
                            : '<small>Sin correo registrado</small>'
                        }
                        ${
                          contact.phone
                            ? `<small>${this.escapeHtml(contact.phone)}</small>`
                            : ''
                        }
                      </article>
                    `,
                  )
                  .join('')}
              </div>
            </div>
          `
          : '';

        return `
          <section class="program-block">
            <header class="program-header">
              <div>
                <h2>${this.escapeHtml(item.program.name)}</h2>
                <p>
                  ${item.userCount} usuario(s) ·
                  ${item.professionalCount} facultativo(s) ·
                  ${item.emails.length} correo(s)
                </p>
              </div>
            </header>

            <div class="program-data">
              <div>
                <span>Correo institucional</span>
                <strong>
                  ${this.escapeHtml(item.program.email || 'No registrado')}
                </strong>
              </div>

              <div>
                <span>Teléfono</span>
                <strong>
                  ${this.escapeHtml(item.program.phone || 'No registrado')}
                </strong>
              </div>

              <div>
                <span>Dirección</span>
                <strong>
                  ${this.escapeHtml(item.program.address || 'No registrada')}
                </strong>
              </div>
            </div>

            ${usersHtml}
            ${professionalsHtml}

            ${
              !users.length && !professionals.length
                ? '<p class="empty">Sin personas asociadas.</p>'
                : ''
            }
          </section>
        `;
      })
      .join('');

    const reportHtml = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Directorio y comunicaciones</title>

          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #20383e;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10pt;
              line-height: 1.35;
            }

            .report-header {
              margin-bottom: 8mm;
              padding-bottom: 5mm;
              border-bottom: 2px solid #0f6b75;
            }

            .report-header small {
              color: #577178;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }

            .report-header h1 {
              margin: 2mm 0 1mm;
              color: #153f49;
              font-size: 21pt;
            }

            .report-header p {
              margin: 0;
              color: #536c72;
            }

            .report-meta {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 3mm;
              margin-top: 5mm;
            }

            .metric {
              padding: 3mm;
              border: 1px solid #c8d9dc;
            }

            .metric span,
            .program-data span {
              display: block;
              color: #647b81;
              font-size: 8pt;
            }

            .metric strong {
              display: block;
              margin-top: 1mm;
              color: #153f49;
              font-size: 14pt;
            }

            .report-section {
              margin-bottom: 8mm;
            }

            .report-section > h2 {
              margin: 0 0 1mm;
              color: #153f49;
              font-size: 15pt;
            }

            .section-description {
              margin: 0 0 4mm;
              color: #60777d;
            }

            .program-block {
              margin-bottom: 8mm;
              border: 1px solid #aebfc3;
              break-inside: auto;
            }

            .program-header {
              padding: 4mm;
              border-bottom: 1px solid #c9d7da;
              background: #f1f7f7;
              break-after: avoid;
            }

            .program-header h2 {
              margin: 0;
              color: #153f49;
              font-size: 14pt;
            }

            .program-header p {
              margin: 1mm 0 0;
              color: #60777d;
              font-size: 8.5pt;
            }

            .program-data {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 3mm;
              padding: 4mm;
              border-bottom: 1px solid #d8e2e4;
              break-inside: avoid;
            }

            .program-data strong {
              display: block;
              margin-top: 1mm;
              overflow-wrap: anywhere;
            }

            .contact-group {
              padding: 4mm;
            }

            .contact-group + .contact-group {
              border-top: 2px solid #b7cccf;
            }

            .contact-group h3 {
              margin: 0;
              color: #153f49;
              font-size: 12pt;
              break-after: avoid;
            }

            .contact-group > p {
              margin: 1mm 0 3mm;
              color: #60777d;
              font-size: 8pt;
            }

            .contact-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 3mm;
            }

            .contact-card {
              min-width: 0;
              padding: 3mm;
              border: 1px solid #cbd9dc;
              break-inside: avoid;
            }

            .contact-card strong,
            .contact-card span,
            .contact-card small {
              display: block;
              overflow-wrap: anywhere;
            }

            .contact-card strong {
              color: #153f49;
            }

            .contact-card span {
              margin-top: 1mm;
              color: #536c72;
            }

            .contact-card small {
              margin-top: 1.5mm;
              color: #345b64;
            }

            .empty {
              margin: 0;
              padding: 4mm;
              color: #60777d;
            }

            .report-footer {
              margin-top: 8mm;
              padding-top: 3mm;
              border-top: 1px solid #c8d5d8;
              color: #60777d;
              font-size: 8pt;
              text-align: right;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <header class="report-header">
            <small>Servicio de Salud Magallanes</small>
            <h1>Directorio y comunicaciones</h1>
            <p>
              Programas, usuarios con acceso al sistema y facultativos
              asociados.
            </p>

            <div class="report-meta">
              <div class="metric">
                <span>Programas visibles</span>
                <strong>${this.visiblePrograms.length}</strong>
              </div>

              <div class="metric">
                <span>Contactos asociados</span>
                <strong>${this.contactCount}</strong>
              </div>

              <div class="metric">
                <span>Correos disponibles</span>
                <strong>${this.emailCount}</strong>
              </div>
            </div>
          </header>

          ${institutionalHtml}

          <section class="report-section">
            <h2>Directorio por programa</h2>
            <p class="section-description">
              Usuarios con acceso y facultativos se presentan en secciones
              independientes.
            </p>

            ${programsHtml}
          </section>

          <footer class="report-footer">
            Reporte generado el ${this.escapeHtml(generatedAt)}
          </footer>

          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print();
              }, 250);
            });

            window.addEventListener('afterprint', function () {
              window.close();
            });
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');

    if (!printWindow) {
      this.notify(
        'El navegador bloqueó la ventana del reporte. Permita ventanas emergentes.',
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  trackByProgram(_index: number, item: DirectoryProgram): number | string {
    return item.program.id ?? item.program.name;
  }

  trackByContact(_index: number, item: DirectoryContact): string {
    return item.key;
  }

  private loadPrograms(): Observable<Program[]> {
    return this.programService.getAll().pipe(
      catchError(() => this.programService.listAll()),
      catchError(() => of([] as Program[])),
    );
  }

  private loadUserRoles(
    users: User[],
    professionals: ProgramProfessional[],
    relations: UserProgramRelation[],
  ): void {
    if (!users.length) {
      this.finishDirectory([], professionals, relations);
      return;
    }

    const roleRequests = users.map((user) => {
      const userId = Number(user.id);

      if (!Number.isFinite(userId)) {
        return of([] as Role[]);
      }

      return this.usersService.getUserRoles(userId);
    });

    forkJoin(roleRequests)
      .pipe(catchError(() => of(users.map(() => [] as Role[]))))
      .subscribe((rolesByUser) => {
        const enrichedUsers = users.map((user, index) => ({
          ...user,
          roles: rolesByUser[index] ?? user.roles ?? [],
        }));

        this.finishDirectory(enrichedUsers, professionals, relations);
      });
  }

  private finishDirectory(
    users: User[],
    professionals: ProgramProfessional[],
    relations: UserProgramRelation[],
  ): void {
    const relationMap = new Map<number, number[]>();

    relations.forEach((relation) => {
      if (relation.userId === null || relation.programId === null) {
        return;
      }

      const programIds = relationMap.get(relation.userId) ?? [];
      programIds.push(relation.programId);
      relationMap.set(relation.userId, programIds);
    });

    const userContacts = users
      .filter((user) => {
        const userId = Number(user.id);

        return (
          Number.isFinite(userId) &&
          userId !== 1 &&
          userId !== 2 &&
          !user.deletedAt
        );
      })
      .map((user) => {
        const id = Number(user.id);

        const programsFromUser = (user.programs ?? [])
          .map((program) => Number(program.id))
          .filter(Number.isFinite);

        const programIds = [
          ...new Set([...programsFromUser, ...(relationMap.get(id) ?? [])]),
        ];

        const roles = (user.roles ?? [])
          .map((role) =>
            String(role.name ?? '')
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean);

        return {
          key: `USER-${id}`,
          source: 'USER' as const,
          id,
          name: this.formatUserName(user),
          email: this.normalizeEmail(user.email),
          phone: '',
          detail: roles.length
            ? roles.map((role) => this.formatCode(role)).join(' · ')
            : 'Usuario del sistema',
          roles,
          programIds,
          active: !user.deletedAt,
        };
      });

    const professionalContacts = professionals
      .filter(
        (professional) =>
          professional.active !== false && !professional.deletedAt,
      )
      .map((professional) => ({
        key: `PROFESSIONAL-${professional.id}`,
        source: 'PROFESSIONAL' as const,
        id: professional.id,
        name: professional.name?.trim() || 'Profesional sin nombre',
        email: this.normalizeEmail(professional.email),
        phone: String(professional.phone ?? '').trim(),
        detail:
          professional.professionName?.trim() ||
          professional.professionCode?.trim() ||
          'Facultativo del programa',
        roles: [],
        programIds: [
          ...new Set([
            ...(professional.programIds ?? []),
            ...(professional.programs ?? [])
              .map((program) => Number(program.id))
              .filter(Number.isFinite),
          ]),
        ],
        active: true,
      }));

    this.contacts = [...userContacts, ...professionalContacts];

    this.institutionalContacts = userContacts
      .filter((contact) =>
        contact.roles.some((role) => role === 'ADMIN' || role === 'SUPERVISOR'),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    this.rebuildDirectory();
  }

  getProgramUsers(item: DirectoryProgram): DirectoryContact[] {
    return item.contacts.filter(
      (contact) => contact.source === 'USER',
    );
  }

  getProgramProfessionals(item: DirectoryProgram): DirectoryContact[] {
    return item.contacts.filter(
      (contact) => contact.source === 'PROFESSIONAL',
    );
  }

  private rebuildDirectory(): void {
    const filters = this.filtersForm.getRawValue();
    const query = this.normalizeSearch(filters.q);
    const roleFilter = String(filters.role ?? '').toUpperCase();

    this.directory = this.programs
      .filter((program) => {
        if (
          filters.programId !== null &&
          Number(program.id) !== Number(filters.programId)
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return this.normalizeSearch(
          [program.name, program.email, program.phone, program.address].join(
            ' ',
          ),
        ).includes(query);
      })
      .map((program) => {
        const programId = Number(program.id);

        const contacts = this.contacts
          .filter((contact) => contact.programIds.includes(programId))
          .filter((contact) => {
            if (filters.onlyActive && !contact.active) {
              return false;
            }

            if (filters.missingEmail && contact.email) {
              return false;
            }

            if (roleFilter && !contact.roles.includes(roleFilter)) {
              return false;
            }

            if (!query) {
              return true;
            }

            return this.normalizeSearch(
              [
                contact.name,
                contact.email,
                contact.phone,
                contact.detail,
                contact.roles.join(' '),
              ].join(' '),
            ).includes(query);
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        const emails = new Set<string>();

        const programEmail = this.normalizeEmail(program.email);

        if (programEmail) {
          emails.add(programEmail);
        }

        contacts.forEach((contact) => {
          if (contact.email) {
            emails.add(contact.email);
          }
        });

        return {
          program,
          contacts,
          emails: [...emails].sort((a, b) => a.localeCompare(b)),
          userCount: contacts.filter((contact) => contact.source === 'USER')
            .length,
          professionalCount: contacts.filter(
            (contact) => contact.source === 'PROFESSIONAL',
          ).length,
        };
      })
      .filter((item) => {
        if (!query) {
          return true;
        }

        return (
          this.normalizeSearch(
            [
              item.program.name,
              item.program.email,
              item.program.phone,
              item.program.address,
            ].join(' '),
          ).includes(query) || item.contacts.length > 0
        );
      });
  }

  private normalizeRelations(relations: any[]): UserProgramRelation[] {
    return (relations ?? []).map((relation) => ({
      userId: this.readNumericId(
        relation?.userId,
        relation?.user?.id,
        relation?.users?.id,
      ),
      programId: this.readNumericId(
        relation?.programId,
        relation?.program?.id,
        relation?.programs?.id,
      ),
    }));
  }

  private readNumericId(...values: unknown[]): number | null {
    for (const value of values) {
      const numeric = Number(value);

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }

    return null;
  }

  private formatUserName(user: User): string {
    const name = [
      user.firstName,
      user.secondName,
      user.firstLastName,
      user.secondLastName,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');

    return name || user.username || 'Usuario sin nombre';
  }

  private formatCode(value: string): string {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private copyText(value: string, successMessage: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => this.notify(successMessage))
        .catch(() => this.fallbackCopy(value, successMessage));
      return;
    }

    this.fallbackCopy(value, successMessage);
  }

  private fallbackCopy(value: string, successMessage: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      this.notify(successMessage);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 2600,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
