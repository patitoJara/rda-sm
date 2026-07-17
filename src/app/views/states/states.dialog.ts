import {
  Component,
  Inject,
  OnInit,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

import {
  forkJoin,
  throwError,
} from 'rxjs';

import {
  finalize,
  map,
  switchMap,
} from 'rxjs/operators';

import { State } from '../../models/state';
import { StateService } from '../../services/state.service';

import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';

interface StateFormValue {
  id: number | null;
  name: string;
  code: string;
  scope: string;
  description: string;
  active: boolean;
}

interface DuplicateSearchResult {
  duplicate?: State;
  duplicateIsDeleted: boolean;
}

@Component({
  standalone: true,
  selector: 'app-states-dialog',
  templateUrl: './states.dialog.html',
  styleUrls: ['./states.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
})
export class StatesDialogComponent
  implements OnInit
{
  form!: FormGroup;
  saving = false;

  readonly availableScopes = [
    {
      value: 'EPISODE',
      label: 'Episodio',
      description:
        'El estado se aplica al episodio completo.',
    },
    {
      value: 'STAGE',
      label: 'Etapa',
      description:
        'El estado se aplica a una etapa del episodio.',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private api: StateService,
    private ref:
      MatDialogRef<StatesDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA)
    public data: State | null,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [
        this.data?.id ?? null,
      ],

      name: [
        this.data?.name ?? '',
        [
          Validators.required,
          Validators.maxLength(120),
        ],
      ],

      code: [
        this.data?.code ?? '',
        [
          Validators.required,
          Validators.maxLength(80),
          Validators.pattern(
            /^[A-Za-z0-9_-]+$/,
          ),
        ],
      ],

      scope: [
        this.data?.scope ??
          'EPISODE',
        [
          Validators.required,
        ],
      ],

      description: [
        this.data?.description ?? '',
        [
          Validators.maxLength(500),
        ],
      ],

      active: [
        this.data?.active ?? true,
      ],
    });
  }

  save(): void {
    if (
      this.form.invalid ||
      this.saving
    ) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.form.disable();

    const value =
      this.form.getRawValue() as StateFormValue;

    const payload: State = {
      name: value.name.trim(),
      code: value.code
        .trim()
        .toUpperCase(),
      scope: value.scope
        .trim()
        .toUpperCase(),
      description:
        value.description.trim() ||
        null,
      active: value.active,
    };

    if (value.id !== null) {
      payload.id = value.id;
    }

    forkJoin({
      allResponse:
        this.api.getAll(),

      deletedResponse:
        this.api.getDeleted(),
    })
      .pipe(
        map(
          ({
            allResponse,
            deletedResponse,
          }: any): DuplicateSearchResult => {
            const allRows: State[] =
              Array.isArray(allResponse)
                ? allResponse
                : (allResponse?.content ??
                  []);

            const deletedRows: State[] =
              Array.isArray(
                deletedResponse,
              )
                ? deletedResponse
                : (deletedResponse?.content ??
                  []);

            const normalizedCode =
              payload.code
                .trim()
                .toUpperCase();

            const deletedDuplicate =
              deletedRows.find(
                (row) =>
                  String(
                    row.code ?? '',
                  )
                    .trim()
                    .toUpperCase() ===
                    normalizedCode &&
                  Number(row.id) !==
                    Number(payload.id),
              );

            if (deletedDuplicate) {
              return {
                duplicate:
                  deletedDuplicate,
                duplicateIsDeleted:
                  true,
              };
            }

            const activeDuplicate =
              allRows.find(
                (row) =>
                  String(
                    row.code ?? '',
                  )
                    .trim()
                    .toUpperCase() ===
                    normalizedCode &&
                  Number(row.id) !==
                    Number(payload.id) &&
                  !row.deletedAt,
              );

            return {
              duplicate:
                activeDuplicate,
              duplicateIsDeleted:
                false,
            };
          },
        ),

        switchMap(
          ({
            duplicate,
            duplicateIsDeleted,
          }) => {
            if (!duplicate) {
              return this.persistState(
                payload,
              );
            }

            if (
              duplicateIsDeleted
            ) {
              return throwError(() => ({
                status: 409,
                error: {
                  message:
                    `El código ${payload.code} pertenece al estado eliminado ` +
                    `“${duplicate.name}” (ID: ${duplicate.id}). ` +
                    `Debe restaurarlo, cambiar su código y volver a eliminarlo antes de reutilizarlo.`,
                },
              }));
            }

            return throwError(() => ({
              status: 409,
              error: {
                message:
                  `El código ${payload.code} ya está asignado al estado ` +
                  `“${duplicate.name}” (ID: ${duplicate.id}).`,
              },
            }));
          },
        ),

        finalize(() => {
          this.saving = false;
          this.form.enable();
        }),
      )
      .subscribe({
        next: (
          row:
            | State
            | null
            | undefined,
        ) => {
          this.ref.close(
            row ?? payload,
          );
        },

        error: (error) => {
          console.error(
            '[StatesDialog] Error guardando estado:',
            error,
          );

          const backendMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.message;

          let message =
            backendMessage ||
            'No fue posible guardar el estado.';

          if (
            error?.status === 400
          ) {
            message =
              backendMessage ||
              'Los datos ingresados no son válidos.';
          } else if (
            error?.status === 401
          ) {
            message =
              'La sesión expiró o no pudo validarse.';
          } else if (
            error?.status === 403
          ) {
            message =
              backendMessage ||
              'El servidor rechazó la modificación del estado.';
          } else if (
            error?.status === 409
          ) {
            message =
              backendMessage ||
              'El código ya pertenece a otro estado.';
          } else if (
            [0, 502, 503, 504].includes(
              error?.status,
            )
          ) {
            message =
              'No fue posible conectar con el servidor.';
          }

          this.showError(message);
        },
      });
  }

  private persistState(
    payload: State,
  ) {
    if (
      payload.id !== undefined &&
      payload.id !== null
    ) {
      return this.api.update(
        Number(payload.id),
        payload,
      );
    }

    return this.api.save(payload);
  }

  private showError(
    message: string,
  ): void {
    this.dialog.open(
      ConfirmDialogOkComponent,
      {
        width: '460px',
        maxWidth: '95vw',
        disableClose: true,
        panelClass:
          'rda-confirm-dialog',
        backdropClass:
          'app-backdrop',
        data: {
          title:
            'No fue posible guardar',
          message,
          confirmText: 'Aceptar',
          color: 'warn',
          icon: 'error',
        },
      },
    );
  }

  cancel(): void {
    if (this.saving) {
      return;
    }

    this.ref.close();
  }
}