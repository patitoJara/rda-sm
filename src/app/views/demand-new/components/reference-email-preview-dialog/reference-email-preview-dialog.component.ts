import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface ReferenceEmailPreviewDialogData {
  originProgramName: string;
  destinationProgramName: string;
  subject: string;
  message: string;
  automaticRecipients: string[];
}

export interface ReferenceEmailPreviewDialogResult {
  confirmed: boolean;
  emails: string[];
  subject: string;
  message: string;
}

@Component({
  selector: 'app-reference-email-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>forward_to_inbox</mat-icon>
      Previsualización de referencia
    </h2>

    <mat-dialog-content>
      <div class="route-box">
        <span>{{ data.originProgramName }}</span>
        <mat-icon>arrow_forward</mat-icon>
        <strong>{{ data.destinationProgramName }}</strong>
      </div>

      <section class="section">
        <div class="section-title">
          <mat-icon>group</mat-icon>
          <span>Destinatarios</span>
        </div>

        <div
          class="empty-recipients"
          *ngIf="!allEmails.length"
        >
          No existen destinatarios automáticos configurados.
          Puede agregar una dirección manualmente.
        </div>

        <mat-chip-set *ngIf="allEmails.length">
          <mat-chip
            *ngFor="let email of allEmails"
            [removable]="!isAutomaticRecipient(email)"
            (removed)="removeAdditionalEmail(email)"
          >
            {{ email }}

            <mat-icon
              matChipRemove
              *ngIf="!isAutomaticRecipient(email)"
            >
              cancel
            </mat-icon>
          </mat-chip>
        </mat-chip-set>

        <form
          class="additional-email"
          [formGroup]="emailForm"

        >
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Agregar otro correo</mat-label>

            <mat-icon matPrefix>alternate_email</mat-icon>

            <input
              matInput
              type="email"
              formControlName="email"
              placeholder="correo@redsalud.gob.cl"
            />

            <mat-error
              *ngIf="emailForm.controls.email.hasError('email')"
            >
              Ingrese un correo válido.
            </mat-error>
          </mat-form-field>

          <button
            mat-stroked-button
            type="button"
            (click)="addEmail()"
            [disabled]="emailForm.invalid"
          >
            <mat-icon>add</mat-icon>
            Agregar
          </button>
        </form>
      </section>

      <section class="section">
        <div class="section-title">
          <mat-icon>subject</mat-icon>
          <span>Asunto</span>
        </div>

        <div class="subject-preview">
          {{ data.subject }}
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <mat-icon>mail</mat-icon>
          <span>Vista previa del correo</span>
        </div>

        <pre class="message-preview">{{ data.message }}</pre>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        type="button"
        (click)="cancel()"
      >
        Cancelar
      </button>

      <button
        mat-flat-button
        type="button"
        color="primary"
        [disabled]="!allEmails.length"
        (click)="confirm()"
      >
        <mat-icon>send</mat-icon>
        Confirmar derivación
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        border: 1px solid rgba(0, 95, 115, 0.22);
        border-radius: 20px;
        box-shadow: 0 18px 50px rgba(0, 60, 75, 0.16);
        overflow: hidden;
      }

      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      mat-dialog-content {
        width: min(760px, 82vw);
        max-height: none;
        overflow: visible;
      }

      .route-box {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        margin-bottom: 18px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.04);
      }

      .section {
        margin-bottom: 4px;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 5px;
        font-weight: 600;
      }

      .additional-email {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: start;
        margin-top: 4px;
      }

      .additional-email mat-form-field {
        width: 100%;
      }

      .subject-preview,
      .message-preview {
        border: 1px solid rgba(0, 0, 0, 0.14);
        border-radius: 8px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.02);
      }

      .message-preview {
        white-space: pre-wrap;
        word-break: break-word;
        font-family: inherit;
        line-height: 1.45;
        max-height: 310px;
        overflow: auto;
      }

      .empty-recipients {
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(255, 193, 7, 0.12);
      }

      @media (max-width: 640px) {
        mat-dialog-content {
          width: auto;
        }

        .additional-email {
          grid-template-columns: 1fr;
        }

        .additional-email button {
          width: 100%;
        }
      }
    `,
  ],
})
export class ReferenceEmailPreviewDialogComponent {
  private readonly fb = inject(FormBuilder);

  private readonly automaticEmails: string[];
  private additionalEmails: string[] = [];

  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private readonly dialogRef: MatDialogRef<
      ReferenceEmailPreviewDialogComponent,
      ReferenceEmailPreviewDialogResult | null
    >,

    @Inject(MAT_DIALOG_DATA)
    public readonly data: ReferenceEmailPreviewDialogData,
  ) {
    this.automaticEmails = this.normalizeEmails(
      data.automaticRecipients ?? [],
    );
  }

  get allEmails(): string[] {
    return this.normalizeEmails([
      ...this.automaticEmails,
      ...this.additionalEmails,
    ]);
  }

  isAutomaticRecipient(email: string): boolean {
    const normalized = email.trim().toLowerCase();

    return this.automaticEmails.includes(normalized);
  }

  addEmail(): void {
    this.emailForm.markAllAsTouched();

    if (this.emailForm.invalid) {
      return;
    }

    const email = String(
      this.emailForm.controls.email.value ?? '',
    )
      .trim()
      .toLowerCase();

    if (
      email &&
      !this.allEmails.includes(email)
    ) {
      this.additionalEmails = [
        ...this.additionalEmails,
        email,
      ];
    }

    this.emailForm.reset({
      email: '',
    });
  }

  removeAdditionalEmail(email: string): void {
    const normalized = email.trim().toLowerCase();

    this.additionalEmails =
      this.additionalEmails.filter(
        (item) => item !== normalized,
      );
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (!this.allEmails.length) {
      return;
    }

    this.dialogRef.close({
      confirmed: true,
      emails: this.allEmails,
      subject: this.data.subject,
      message: this.data.message,
    });
  }

  private normalizeEmails(
    emails: string[],
  ): string[] {
    return Array.from(
      new Set(
        (emails ?? [])
          .map((email) =>
            String(email ?? '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );
  }
}