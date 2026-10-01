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
import { TokenService } from '../../services/token.service';
import { CurrentUserService } from '../../services/current-user.service';

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
  communicationsByProgram: Record<number, UserProgramRelation>;
  transversalCommunication: UserProgramRelation | null;
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
  id: number | null;
  userId: number | null;
  programId: number | null;
  transversal: boolean;
  communicationScope: string | null;

  canManageCommunications: boolean;
  canReceiveCitations: boolean;
  canReceiveAttendances: boolean;
  canReceiveFeedback: boolean;
  canReceiveReferences: boolean;
  canReceiveClosures: boolean;
  canReceiveDocuments: boolean;
  canReceiveObservations: boolean;
}

type CommunicationFlag =
  | 'canManageCommunications'
  | 'canReceiveCitations'
  | 'canReceiveAttendances'
  | 'canReceiveFeedback'
  | 'canReceiveReferences'
  | 'canReceiveClosures'
  | 'canReceiveDocuments'
  | 'canReceiveObservations';

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
  private readonly tokenService = inject(TokenService);
  private readonly currentUserService = inject(CurrentUserService);
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
        .getCommunicationConfigurations()
        .pipe(
          catchError((error) => {
            console.error(
              '[DIRECTORIO] Error cargando configuraciones de comunicaciones',
              error,
            );
            return of([] as any[]);
          }),
        ),

      userRoleRelations: this.usersService
        .getAllUserRoleRelations()
        .pipe(
          catchError((error) => {
            console.error(
              '[DIRECTORIO] Error cargando roles de usuarios',
              error,
            );
            return of([] as any[]);
          }),
        ),
    })
      .pipe(
        map((result) => {
          const normalizedRelations = this.normalizeRelations(result.relations);

          return {
            ...result,
            relations: normalizedRelations,
          };
        }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: ({
          programs,
          professionals,
          users,
          relations,
          userRoleRelations,
        }) => {
          this.programs = programs
            .filter((program) => program.active !== false && !program.deletedAt)
            .sort((a, b) => a.name.localeCompare(b.name));

          this.finishDirectory(
            users,
            professionals,
            relations,
            userRoleRelations,
          );
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

    const recipientRows: Array<Record<string, string>> = [];

    this.institutionalContacts
      .filter((contact) => contact.source === 'USER')
      .forEach((contact) => {
        recipientRows.push({
          Alcance: 'Transversal',
          Programa: 'TRANSVERSAL',
          Usuario: contact.name,
          Correo: contact.email || '',
          'Correo institucional programa': '',
          'Admin. comunicaciones': this.isTransversalCommunicationEnabled(
            contact,
            'canManageCommunications',
          )
            ? 'Sí'
            : 'No',
          Citaciones: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveCitations',
          )
            ? 'Sí'
            : 'No',
          Asistencias: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveAttendances',
          )
            ? 'Sí'
            : 'No',
          Retroalimentaciones: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveFeedback',
          )
            ? 'Sí'
            : 'No',
          Referencias: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveReferences',
          )
            ? 'Sí'
            : 'No',
          Cierres: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveClosures',
          )
            ? 'Sí'
            : 'No',
          Documentos: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveDocuments',
          )
            ? 'Sí'
            : 'No',
          Observaciones: this.isTransversalCommunicationEnabled(
            contact,
            'canReceiveObservations',
          )
            ? 'Sí'
            : 'No',
        });
      });

    this.visiblePrograms.forEach((item) => {
      const programId = Number(item.program.id);

      this.getProgramUsers(item).forEach((contact) => {
        recipientRows.push({
          Alcance: 'Programa',
          Programa: item.program.name,
          Usuario: contact.name,
          Correo: contact.email || '',
          'Correo institucional programa': item.program.email || '',
          'Admin. comunicaciones': this.isCommunicationEnabled(
            contact,
            programId,
            'canManageCommunications',
          )
            ? 'Sí'
            : 'No',
          Citaciones: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveCitations',
          )
            ? 'Sí'
            : 'No',
          Asistencias: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveAttendances',
          )
            ? 'Sí'
            : 'No',
          Retroalimentaciones: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveFeedback',
          )
            ? 'Sí'
            : 'No',
          Referencias: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveReferences',
          )
            ? 'Sí'
            : 'No',
          Cierres: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveClosures',
          )
            ? 'Sí'
            : 'No',
          Documentos: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveDocuments',
          )
            ? 'Sí'
            : 'No',
          Observaciones: this.isCommunicationEnabled(
            contact,
            programId,
            'canReceiveObservations',
          )
            ? 'Sí'
            : 'No',
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

    appendSheet(
      recipientRows.length
        ? recipientRows
        : [{
            Alcance: '',
            Programa: '',
            Usuario: '',
            Correo: '',
            'Correo institucional programa': '',
            'Admin. comunicaciones': '',
            Citaciones: '',
            Asistencias: '',
            Retroalimentaciones: '',
            Referencias: '',
            Cierres: '',
            Documentos: '',
            Observaciones: '',
          }],
      'Destinatarios correo',
      [15, 45, 35, 40, 40, 20, 14, 14, 22, 16, 12, 14, 16],
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

    const logoUrl =
      `${window.location.origin}/assets/logoSSM.png`;

    const mark = (enabled: boolean): string =>
      enabled
        ? '<span class="flag flag--yes">✓</span>'
        : '<span class="flag flag--no">—</span>';

    const transversalRows = this.institutionalContacts
      .filter((contact) => contact.source === 'USER')
      .map(
        (contact) => `
          <tr>
            <td class="person">
              <strong>${this.escapeHtml(contact.name)}</strong>
            </td>

            <td class="email">
              ${this.escapeHtml(
                contact.email || 'Sin correo registrado',
              )}
            </td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canManageCommunications',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveCitations',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveAttendances',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveFeedback',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveReferences',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveClosures',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveDocuments',
              ),
            )}</td>

            <td>${mark(
              this.isTransversalCommunicationEnabled(
                contact,
                'canReceiveObservations',
              ),
            )}</td>
          </tr>
        `,
      )
      .join('');

    const transversalHtml = transversalRows
      ? `
        <section class="transversal-section">
          <div class="section-heading">
            <div>
              <small>CONFIGURACIÓN TRANSVERSAL</small>
              <h2>Contactos institucionales</h2>
            </div>

            <p>
              Usuarios configurados para comunicaciones que no dependen
              exclusivamente de un programa.
            </p>
          </div>

          <table class="communication-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Admin.</th>
                <th>Cit.</th>
                <th>Asist.</th>
                <th>Retro.</th>
                <th>Ref.</th>
                <th>Cierre</th>
                <th>Doc.</th>
                <th>Obs.</th>
              </tr>
            </thead>

            <tbody>
              ${transversalRows}
            </tbody>
          </table>
        </section>
      `
      : '';

    const programsHtml = this.visiblePrograms
      .map((item) => {
        const programId = Number(item.program.id);

        const users = this.getProgramUsers(item);
        const professionals = this.getProgramProfessionals(item);

        const userRows = users.length
          ? users
              .map(
                (contact) => `
                  <tr>
                    <td class="person">
                      <strong>${this.escapeHtml(contact.name)}</strong>
                    </td>

                    <td class="email">
                      ${this.escapeHtml(
                        contact.email || 'Sin correo registrado',
                      )}
                    </td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canManageCommunications',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveCitations',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveAttendances',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveFeedback',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveReferences',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveClosures',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveDocuments',
                      ),
                    )}</td>

                    <td>${mark(
                      this.isCommunicationEnabled(
                        contact,
                        programId,
                        'canReceiveObservations',
                      ),
                    )}</td>
                  </tr>
                `,
              )
              .join('')
          : `
              <tr>
                <td colspan="10" class="empty">
                  Sin usuarios asociados.
                </td>
              </tr>
            `;

        const professionalsHtml = professionals.length
          ? `
            <div class="professionals">
              <strong>Facultativos / contactos del programa</strong>

              <div class="professional-list">
                ${professionals
                  .map(
                    (contact) => `
                      <span>
                        <b>${this.escapeHtml(contact.name)}</b>
                        ${
                          contact.email
                            ? ` · ${this.escapeHtml(contact.email)}`
                            : ''
                        }
                      </span>
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
                <small>PROGRAMA</small>
                <h2>${this.escapeHtml(item.program.name)}</h2>
              </div>

              <div class="program-count">
                ${users.length} usuario(s) ·
                ${professionals.length} facultativo(s)
              </div>
            </header>

            <div class="institutional-email">
              <span>Correo institucional automático</span>

              <strong>
                ${this.escapeHtml(
                  item.program.email || 'No registrado',
                )}
              </strong>

              <small>
                Este correo se incorpora automáticamente a las
                notificaciones del programa cuando está registrado.
              </small>
            </div>

            <table class="communication-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Admin.</th>
                  <th>Cit.</th>
                  <th>Asist.</th>
                  <th>Retro.</th>
                  <th>Ref.</th>
                  <th>Cierre</th>
                  <th>Doc.</th>
                  <th>Obs.</th>
                </tr>
              </thead>

              <tbody>
                ${userRows}
              </tbody>
            </table>

            ${professionalsHtml}
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
              size: Letter landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
            }

            body {
              color: #263940;
              background: #ffffff;
              font-family: Roboto, Arial, sans-serif;
              font-size: 8px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .report-header {
              display: grid;
              grid-template-columns: 110px 1fr auto;
              align-items: center;
              gap: 14px;
              margin-bottom: 8px;
              padding-bottom: 7px;
              border-bottom: 3px solid #087f91;
            }

            .report-logo {
              max-width: 105px;
              max-height: 58px;
              object-fit: contain;
            }

            .report-title small {
              display: block;
              color: #08778a;
              font-size: 7px;
              font-weight: 800;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .report-title h1 {
              margin: 2px 0;
              color: #263940;
              font-size: 18px;
              line-height: 1.1;
            }

            .report-title p {
              margin: 0;
              color: #60727b;
              font-size: 8px;
            }

            .report-date {
              color: #60727b;
              font-size: 8.5px;
              text-align: right;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 7px;
              margin-bottom: 10px;
            }

            .summary-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              padding: 6px 9px;
              border: 1px solid #dce5e9;
              border-radius: 7px;
              background: #f8fafb;
            }

            .summary-card span {
              color: #415861;
              font-size: 9.5px;
              font-weight: 700;
            }

            .summary-card strong {
              color: #20313a;
              font-size: 12px;
              font-weight: 800;
            }

            .section-heading {
              display: flex;
              align-items: end;
              justify-content: space-between;
              gap: 15px;
              margin-bottom: 5px;
            }

            .section-heading small {
              display: block;
              color: #08778a;
              font-size: 6.5px;
              font-weight: 800;
              letter-spacing: .08em;
            }

            .section-heading h2 {
              margin: 1px 0 0;
              font-size: 12px;
            }

            .section-heading p {
              max-width: 440px;
              margin: 0;
              color: #71828a;
              font-size: 7px;
              text-align: right;
            }

            .transversal-section {
              margin-bottom: 12px;
            }

            .program-block {
              margin-top: 10px;
              padding-top: 7px;
              border-top: 2px solid #9fc7cd;
              break-inside: auto;
            }

            .program-header {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 5px;
              break-after: avoid;
            }

            .program-header small {
              display: block;
              color: #08778a;
              font-size: 6px;
              font-weight: 800;
              letter-spacing: .08em;
            }

            .program-header h2 {
              margin: 1px 0 0;
              color: #20313a;
              font-size: 12px;
            }

            .program-count {
              color: #60727b;
              font-size: 8.5px;
              font-weight: 600;
            }

            .institutional-email {
              display: grid;
              grid-template-columns: 150px minmax(170px, auto) 1fr;
              align-items: center;
              gap: 8px;
              margin-bottom: 5px;
              padding: 5px 7px;
              border: 1px solid #b9dce1;
              border-radius: 6px;
              background: #edf7f8;
              break-inside: avoid;
            }

            .institutional-email span {
              color: #08778a;
              font-size: 9px;
              font-weight: 800;
            }

            .institutional-email strong {
              color: #20313a;
              font-size: 9px;
              font-weight: 700;
              overflow-wrap: anywhere;
            }

            .institutional-email small {
              color: #60727b;
              font-size: 8.5px;
              font-weight: 500;
            }

            .communication-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            .communication-table thead {
              display: table-header-group;
            }

            .communication-table tr {
              break-inside: avoid;
            }

            .communication-table th {
              padding: 4px 3px;
              color: #415861;
              border: 1px solid #cfdde2;
              background: #e6f2f5;
              font-size: 8px;
              font-weight: 800;
              text-align: center;
              white-space: nowrap;
            }

            .communication-table th:first-child,
            .communication-table th:nth-child(2) {
              text-align: left;
            }

            .communication-table th:first-child {
              width: 19%;
            }

            .communication-table th:nth-child(2) {
              width: 25%;
            }

            .communication-table th:nth-child(n+3) {
              width: 7%;
            }

            .communication-table td {
              padding: 4px 3px;
              color: #344b54;
              border: 1px solid #e2eaed;
              font-size: 8.5px;
              text-align: center;
              vertical-align: middle;
            }

            .communication-table td.person,
            .communication-table td.email {
              text-align: left;
            }

            .person strong {
              color: #20313a;
              font-weight: 800;
            }

            .email {
              overflow-wrap: anywhere;
            }

            .flag {
              display: inline-grid;
              width: 16px;
              height: 16px;
              place-items: center;
              border-radius: 50%;
              font-size: 9px;
              font-weight: 900;
            }

            .flag--yes {
              color: #117044;
              background: #eaf8f1;
              border: 1px solid #a9ddc4;
            }

            .flag--no {
              color: #8a9aa0;
              background: #f5f7f8;
              border: 1px solid #dce3e6;
            }

            .professionals {
              margin-top: 5px;
              padding: 5px 7px;
              border: 1px solid #e0e8ea;
              border-radius: 5px;
              background: #fafcfc;
              break-inside: avoid;
            }

            .professionals > strong {
              display: block;
              margin-bottom: 3px;
              color: #415861;
              font-size: 8.5px;
            }

            .professional-list {
              display: flex;
              flex-wrap: wrap;
              gap: 4px 12px;
            }

            .professional-list span {
              color: #3f555e;
              font-size: 9px;
              font-weight: 600;
              line-height: 1.25;
            }

            .empty {
              padding: 6px !important;
              color: #7a8c93 !important;
              text-align: left !important;
            }

            .legend {
              display: flex;
              align-items: center;
              gap: 14px;
              margin: 7px 0 4px;
              color: #60727b;
              font-size: 8.5px;
              font-weight: 600;
            }

            .legend-item {
              display: inline-flex;
              align-items: center;
              gap: 4px;
            }

            .report-footer {
              margin-top: 8px;
              padding-top: 4px;
              color: #71828a;
              border-top: 1px solid #d7e2e6;
              font-size: 6.5px;
              text-align: right;
            }
          </style>
        </head>

        <body>
          <header class="report-header">
            <img
              src="${logoUrl}"
              class="report-logo"
              alt="Servicio de Salud Magallanes"
            />

            <div class="report-title">
              <small>
                Servicio de Salud Magallanes · Salud Mental
              </small>

              <h1>Directorio y comunicaciones</h1>

              <p>
                Contactos institucionales y configuración de
                destinatarios de notificaciones.
              </p>
            </div>

            <div class="report-date">
              <strong>Generado</strong><br />
              ${this.escapeHtml(generatedAt)}
            </div>
          </header>

          <section class="summary">
            <div class="summary-card">
              <span>Programas visibles</span>
              <strong>${this.visiblePrograms.length}</strong>
            </div>

            <div class="summary-card">
              <span>Contactos asociados</span>
              <strong>${this.contactCount}</strong>
            </div>

            <div class="summary-card">
              <span>Correos disponibles</span>
              <strong>${this.emailCount}</strong>
            </div>
          </section>

          <div class="legend">
            <span class="legend-item">
              <span class="flag flag--yes">✓</span>
              Recibe la notificación
            </span>

            <span class="legend-item">
              <span class="flag flag--no">—</span>
              No configurado para esa acción
            </span>
          </div>

          ${transversalHtml}

          <section>
            <div class="section-heading">
              <div>
                <small>DIRECTORIO POR PROGRAMA</small>
                <h2>Destinatarios de comunicaciones</h2>
              </div>

              <p>
                El correo institucional del programa se presenta
                separadamente de los usuarios configurados por acción.
              </p>
            </div>

            ${programsHtml}
          </section>

          <footer class="report-footer">
            Servicio de Salud Magallanes · Sistema Gestión de Demanda
          </footer>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const doc = printWindow?.document;

    if (!printWindow || !doc) {
      iframe.remove();

      this.notify(
        'No fue posible preparar el reporte para impresión.',
      );

      return;
    }

    doc.open();
    doc.write(reportHtml);
    doc.close();

    const print = (): void => {
      printWindow.focus();
      printWindow.print();

      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    const logo = doc.querySelector('img');

    if (
      logo instanceof HTMLImageElement &&
      !logo.complete
    ) {
      logo.addEventListener(
        'load',
        print,
        { once: true },
      );

      logo.addEventListener(
        'error',
        print,
        { once: true },
      );

      return;
    }

    window.setTimeout(print, 150);
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

  private finishDirectory(
    users: User[],
    professionals: ProgramProfessional[],
    relations: UserProgramRelation[],
    userRoleRelations: any[],
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

          communicationsByProgram: relations
            .filter(
              (relation) =>
                relation.userId === id &&
                relation.programId !== null,
            )
            .reduce<Record<number, UserProgramRelation>>(
              (acc, relation) => {
                if (relation.programId !== null) {
                  acc[relation.programId] = relation;
                }

                return acc;
              },
              {},
            ),

          transversalCommunication:
            relations.find(
              (relation) =>
                relation.userId === id &&
                relation.programId === null &&
                relation.transversal === true,
            ) ?? null,

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
        communicationsByProgram: {},
        transversalCommunication: null,
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


    const institutionalUserIds = new Set<number>(
      (userRoleRelations ?? [])
        .filter(
          (relation) =>
            relation?.active !== false &&
            !relation?.deletedAt,
        )
        .filter((relation) => {
          const role = String(
            relation?.role?.code ??
              relation?.role?.name ??
              '',
          )
            .trim()
            .toUpperCase();

          return role === 'ADMIN' || role === 'SUPERVISOR';
        })
        .map((relation) =>
          this.readNumericId(
            relation?.user?.id,
            relation?.userId,
          ),
        )
        .filter(
          (userId): userId is number =>
            userId !== null,
        ),
    );

    this.institutionalContacts = userContacts
      .filter((contact) =>
        institutionalUserIds.has(contact.id),
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


  isCommunicationEnabled(
    contact: DirectoryContact,
    programId: number | null | undefined,
    flag: CommunicationFlag,
  ): boolean {
    const numericProgramId = Number(programId);

    if (!Number.isFinite(numericProgramId)) {
      return false;
    }

    const relation = contact.communicationsByProgram[numericProgramId];

    return Boolean(relation?.[flag]);
  }


  private readonly updatingCommunicationRelations = new Set<number>();

  isCommunicationUpdating(
    contact: DirectoryContact,
    programId: number | null | undefined,
  ): boolean {
    const numericProgramId = Number(programId);

    if (!Number.isFinite(numericProgramId)) {
      return false;
    }

    const relation = contact.communicationsByProgram[numericProgramId];

    return relation?.id !== null &&
      relation?.id !== undefined &&
      this.updatingCommunicationRelations.has(relation.id);
  }

  private isAdministrativeRoleActive(): boolean {
    const activeRole = String(
      this.tokenService.getActiveRole() ?? '',
    )
      .trim()
      .toUpperCase();

    return activeRole === 'ADMIN';
  }

  canEditCommunications(): boolean {
    // El nivel "Administración y supervisión" no se administra a sí mismo.
    // Solo un ADMIN global puede modificar configuraciones transversales.
    return this.isAdministrativeRoleActive();
  }

  canAssignCommunicationAdministrator(): boolean {
    if (this.isAdministrativeRoleActive()) {
      return true;
    }

    const currentUserId = this.tokenService.getUserId();

    if (currentUserId === null) {
      return false;
    }

    const currentContact = this.contacts.find(
      (contact) =>
        contact.source === 'USER' &&
        contact.id === currentUserId,
    );

    // Administración y supervisión actúa hacia abajo:
    // puede designar administradores de comunicaciones de programas.
    return Boolean(
      currentContact?.transversalCommunication?.canManageCommunications,
    );
  }

  canModifyCommunication(
    programId: number | null | undefined,
  ): boolean {
    if (this.isAdministrativeRoleActive()) {
      return true;
    }

    const currentUserId = this.tokenService.getUserId();
    const numericProgramId = Number(programId);

    if (
      currentUserId === null ||
      !Number.isFinite(numericProgramId)
    ) {
      return false;
    }

    const currentContact = this.contacts.find(
      (contact) =>
        contact.source === 'USER' &&
        contact.id === currentUserId,
    );

    if (!currentContact) {
      return false;
    }

    // Administración y supervisión administra hacia abajo
    // todos los programas.
    if (
      currentContact.transversalCommunication
        ?.canManageCommunications
    ) {
      return true;
    }

    // Un administrador de programa administra únicamente
    // las notificaciones de su propio programa.
    return Boolean(
      currentContact.communicationsByProgram[numericProgramId]
        ?.canManageCommunications,
    );
  }
  onCommunicationFlagChange(
    contact: DirectoryContact,
    programId: number | null | undefined,
    flag: CommunicationFlag,
    checked: boolean,
  ): void {
    const numericProgramId = Number(programId);

    if (!Number.isFinite(numericProgramId)) {
      this.notify('No fue posible identificar el programa.');
      return;
    }


    const canModify =
      flag === 'canManageCommunications'
        ? this.canAssignCommunicationAdministrator()
        : this.canModifyCommunication(numericProgramId);

    if (!canModify) {
      this.notify(
        'No tiene permisos para modificar la configuración de comunicaciones.',
      );
      return;
    }

    const relation = contact.communicationsByProgram[numericProgramId];
    const relationId = relation?.id;

    if (relationId === null || relationId === undefined) {
      this.notify('No existe una relación usuario-programa para actualizar.');
      return;
    }

    if (this.updatingCommunicationRelations.has(relationId)) {
      return;
    }

    const previousValue = Boolean(relation[flag]);

    if (previousValue === checked) {
      return;
    }

    this.updatingCommunicationRelations.add(relationId);

    this.usersService.getUserProgramById(relationId).subscribe({
      next: (currentRelation) => {
        const payload = {
          ...currentRelation,
          [flag]: checked,
        };

        this.usersService.updateUserProgram(relationId, payload).subscribe({
          next: (updatedRelation) => {
            const normalized =
              this.normalizeRelations([updatedRelation])[0];

            if (normalized) {
              contact.communicationsByProgram[numericProgramId] = normalized;
            }

            this.updatingCommunicationRelations.delete(relationId);

            this.notify('Configuración de comunicaciones actualizada.');
          },

          error: (error) => {
            console.error(
              '[DIRECTORIO] Error actualizando users_programs',
              error,
            );

            this.updatingCommunicationRelations.delete(relationId);

            relation[flag] = previousValue;

            this.notify(
              'No fue posible actualizar la configuración de comunicaciones.',
            );
          },
        });
      },

      error: (error) => {
        console.error(
          '[DIRECTORIO] Error obteniendo users_programs',
          error,
        );

        this.updatingCommunicationRelations.delete(relationId);

        relation[flag] = previousValue;

        this.notify(
          'No fue posible obtener la configuración del usuario.',
        );
      },
    });
  }

  private readonly updatingTransversalUsers = new Set<number>();

  isTransversalCommunicationEnabled(
    contact: DirectoryContact,
    flag: CommunicationFlag,
  ): boolean {
    return Boolean(contact.transversalCommunication?.[flag]);
  }

  isTransversalCommunicationUpdating(
    contact: DirectoryContact,
  ): boolean {
    const userId = Number(contact.id);

    return Number.isFinite(userId) &&
      this.updatingTransversalUsers.has(userId);
  }

  onTransversalCommunicationFlagChange(
    contact: DirectoryContact,
    flag: CommunicationFlag,
    checked: boolean,
  ): void {
    const userId = Number(contact.id);

    if (!Number.isFinite(userId)) {
      this.notify('No fue posible identificar el usuario.');
      return;
    }

    if (!this.canEditCommunications()) {
      this.notify(
        'No tiene permisos para modificar la configuración de comunicaciones.',
      );
      return;
    }

    if (this.updatingTransversalUsers.has(userId)) {
      return;
    }

    const relation = contact.transversalCommunication;
    const previousValue = Boolean(relation?.[flag]);

    if (previousValue === checked) {
      return;
    }

    this.updatingTransversalUsers.add(userId);

    if (relation?.id !== null && relation?.id !== undefined) {
      const relationId = relation.id;

      this.usersService.getUserProgramById(relationId).subscribe({
        next: (currentRelation) => {
          const payload = {
            ...currentRelation,
            [flag]: checked,
          };

          this.usersService.updateUserProgram(relationId, payload).subscribe({
            next: (updatedRelation) => {
              const normalized =
                this.normalizeRelations([updatedRelation])[0];

              if (normalized) {
                contact.transversalCommunication = normalized;
              }

              this.updatingTransversalUsers.delete(userId);
              this.notify('Configuración transversal actualizada.');
            },

            error: (error) => {
              console.error(
                '[DIRECTORIO] Error actualizando configuración transversal',
                error,
              );

              this.updatingTransversalUsers.delete(userId);
              this.notify(
                'No fue posible actualizar la configuración transversal.',
              );
            },
          });
        },

        error: (error) => {
          console.error(
            '[DIRECTORIO] Error obteniendo configuración transversal',
            error,
          );

          this.updatingTransversalUsers.delete(userId);
          this.notify(
            'No fue posible obtener la configuración transversal.',
          );
        },
      });

      return;
    }

    const payload = {
      userId,
      programId: null,
      transversal: true,
      communicationScope: 'TRANSVERSAL',
      isActive: true,
      isSupervisor: false,
      canManageCommunications: false,
      canReceiveCitations: false,
      canReceiveAttendances: false,
      canReceiveFeedback: false,
      canReceiveReferences: false,
      canReceiveClosures: false,
      canReceiveDocuments: false,
      canReceiveObservations: false,
      canManageDemands: false,
      canViewDashboard: false,
      [flag]: checked,
    };

    this.usersService.createUserProgram(payload).subscribe({
      next: (createdRelation) => {
        const normalized =
          this.normalizeRelations([createdRelation])[0];

        if (normalized) {
          contact.transversalCommunication = normalized;
        }

        this.updatingTransversalUsers.delete(userId);
        this.notify('Configuración transversal creada.');
      },

      error: (error) => {
        console.error(
          '[DIRECTORIO] Error creando configuración transversal',
          error,
        );

        this.updatingTransversalUsers.delete(userId);
        this.notify(
          'No fue posible crear la configuración transversal.',
        );
      },
    });
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
      id: this.readNumericId(relation?.id),

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

      transversal: relation?.transversal === true,
      communicationScope:
        typeof relation?.communicationScope === 'string'
          ? relation.communicationScope
          : null,

      canManageCommunications: relation?.canManageCommunications === true,
      canReceiveCitations: relation?.canReceiveCitations === true,
      canReceiveAttendances: relation?.canReceiveAttendances === true,
      canReceiveFeedback: relation?.canReceiveFeedback === true,
      canReceiveReferences: relation?.canReceiveReferences === true,
      canReceiveClosures: relation?.canReceiveClosures === true,
      canReceiveDocuments: relation?.canReceiveDocuments === true,
      canReceiveObservations: relation?.canReceiveObservations === true,
    }));
  }

  private readNumericId(...values: unknown[]): number | null {
    for (const value of values) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

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







