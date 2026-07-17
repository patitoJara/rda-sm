// src/app/views/results/results.dialog.ts

import { Component, Inject, OnInit } from '@angular/core';
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

import { forkJoin, throwError } from 'rxjs';

import {
  concatMap,
  finalize,
  map,
  switchMap,
} from 'rxjs/operators';

import { ResultService } from '../../services/result.service';
import { Result } from '../../models/result';

import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';

/**
 * Ámbito utilizado actualmente por el catálogo de resultados.
 *
 * EPISODE significa que el resultado afecta al episodio completo,
 * no a una etapa, evento o referencia individual.
 *
 * Revisar esta constante si posteriormente el backend incorpora
 * otros ámbitos, por ejemplo: STAGE, EVENT o REFERENCE.
 */
const RESULT_SCOPE = 'EPISODE' as const;

type ResultScope = typeof RESULT_SCOPE;

interface ResultFormValue {
  id: number | null;
  name: string;
  code: string;
  scope: ResultScope;
  description: string;
  active: boolean;
}

interface DuplicateSearchResult {
  duplicate?: Result;
  duplicateIsDeleted: boolean;
}

@Component({
  standalone: true,
  selector: 'app-results-dialog',
  templateUrl: './results.dialog.html',
  styleUrls: ['./results.dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
})
export class ResultsDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  /**
   * Se expone por si se necesita utilizar en el HTML.
   */
  readonly resultScope = RESULT_SCOPE;

  constructor(
    private fb: FormBuilder,
    private api: ResultService,
    private ref: MatDialogRef<ResultsDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: Result | null,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [this.data?.id ?? null],

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
          Validators.pattern(/^[A-Za-z0-9_-]+$/),
        ],
      ],

      /**
       * El ámbito queda fijo en EPISODE.
       *
       * No se utiliza this.data?.scope porque todos los resultados
       * actuales pertenecen al episodio completo.
       */
      scope: [
        RESULT_SCOPE,
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
    console.log('[ResultsDialog] save() ejecutado');

    console.log('[ResultsDialog] Estado formulario:', {
      invalid: this.form.invalid,
      saving: this.saving,
      value: this.form.getRawValue(),
    });

    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.form.disable();

    const value = this.form.getRawValue() as ResultFormValue;

    const payload: Result = {
      name: value.name.trim(),
      code: value.code.trim().toUpperCase(),

      /**
       * Se fuerza el valor desde la constante.
       *
       * Aunque alguien manipule el formulario desde el navegador,
       * siempre se enviará EPISODE al backend.
       */
      scope: RESULT_SCOPE,

      description: value.description.trim() || null,
      active: value.active,
    };

    if (value.id !== null) {
      payload.id = value.id;
    }

    console.log(
      '[ResultsDialog] Iniciando validación:',
      payload,
    );

    forkJoin({
      allResponse: this.api.getAll(),
      deletedResponse: this.api.getDeleted(),
    })
      .pipe(
        map(
          ({
            allResponse,
            deletedResponse,
          }: any): DuplicateSearchResult => {
            const allRows: Result[] = Array.isArray(allResponse)
              ? allResponse
              : (allResponse?.content ?? []);

            const deletedRows: Result[] =
              Array.isArray(deletedResponse)
                ? deletedResponse
                : (deletedResponse?.content ?? []);

            console.log(
              '[ResultsDialog] Todos:',
              allRows,
            );

            console.log(
              '[ResultsDialog] Eliminados:',
              deletedRows,
            );

            const normalizedCode = payload.code
              .trim()
              .toUpperCase();

            /*
             * Primero se busca el código entre los registros
             * eliminados lógicamente.
             */
            const deletedDuplicate = deletedRows.find(
              (row) => {
                const rowCode = String(row.code ?? '')
                  .trim()
                  .toUpperCase();

                return (
                  rowCode === normalizedCode &&
                  Number(row.id) !== Number(payload.id)
                );
              },
            );

            if (deletedDuplicate) {
              return {
                duplicate: deletedDuplicate,
                duplicateIsDeleted: true,
              };
            }

            /*
             * Si no está eliminado, se comprueba si pertenece
             * a otro registro activo.
             */
            const activeDuplicate = allRows.find(
              (row) => {
                const rowCode = String(row.code ?? '')
                  .trim()
                  .toUpperCase();

                return (
                  rowCode === normalizedCode &&
                  Number(row.id) !== Number(payload.id) &&
                  !row.deletedAt
                );
              },
            );

            return {
              duplicate: activeDuplicate,
              duplicateIsDeleted: false,
            };
          },
        ),

        switchMap(
          ({
            duplicate,
            duplicateIsDeleted,
          }: DuplicateSearchResult) => {
            /*
             * El código no está ocupado por otro registro.
             */
            if (!duplicate) {
              console.log(
                '[ResultsDialog] Código disponible. Guardando resultado.',
              );

              return this.persistResult(payload);
            }

            /*
             * El código pertenece a otro registro activo.
             */
            if (!duplicateIsDeleted) {
              return throwError(() => ({
                status: 409,
                error: {
                  message:
                    `El código ${payload.code} ya está asignado ` +
                    `al resultado “${duplicate.name}” ` +
                    `(ID: ${duplicate.id}).`,
                },
              }));
            }

            /*
             * El código pertenece a un registro eliminado.
             *
             * Se cambia su código por uno histórico para liberar
             * el código oficial.
             */
            const duplicateId = Number(duplicate.id);

            const historicalCode =
              this.buildHistoricalCode(
                payload.code,
                duplicateId,
              );

            const historicalPayload: Result = {
              ...duplicate,
              id: duplicateId,
              code: historicalCode,
              active: false,

              /*
               * También se normaliza el ámbito del registro histórico.
               */
              scope: RESULT_SCOPE,
            };

            console.log(
              `[ResultsDialog] Código encontrado en ` +
                `registro eliminado ID ${duplicateId}.`,
            );

            console.log(
              `[ResultsDialog] Nuevo código histórico: ` +
                `${historicalCode}`,
            );

            return this.api
              .restore(duplicateId)
              .pipe(
                /*
                 * 1. Restaurar el registro eliminado.
                 */
                concatMap(() => {
                  console.log(
                    `[ResultsDialog] ID ${duplicateId} ` +
                      `restaurado. Modificando código.`,
                  );

                  return this.api.update(
                    duplicateId,
                    historicalPayload,
                  );
                }),

                /*
                 * 2. Volver a eliminarlo después de cambiar
                 *    su código.
                 */
                concatMap(() => {
                  console.log(
                    `[ResultsDialog] Código del ID ` +
                      `${duplicateId} modificado. ` +
                      `Eliminando nuevamente.`,
                  );

                  return this.api.delete(duplicateId);
                }),

                /*
                 * 3. Guardar el código liberado en el registro
                 *    que se está editando.
                 */
                concatMap(() => {
                  console.log(
                    `[ResultsDialog] ID ${duplicateId} ` +
                      `eliminado nuevamente. ` +
                      `Actualizando ID ${payload.id}.`,
                  );

                  return this.persistResult(payload);
                }),
              );
          },
        ),

        finalize(() => {
          console.log(
            '[ResultsDialog] Flujo finalizado',
          );

          this.saving = false;
          this.form.enable();

          /*
           * El ámbito debe permanecer fijo después de volver
           * a habilitar el formulario.
           */
          this.form
            .get('scope')
            ?.setValue(RESULT_SCOPE, {
              emitEvent: false,
            });
        }),
      )
      .subscribe({
        next: (
          row: Result | null | undefined,
        ) => {
          console.log(
            '[ResultsDialog] Resultado guardado correctamente:',
            row,
          );

          this.ref.close(row ?? payload);
        },

        error: (error) => {
          console.error(
            '[ResultsDialog] Error guardando resultado:',
            error,
          );

          const backendMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.message;

          let message =
            backendMessage ||
            'No fue posible guardar el resultado.';

          if (error?.status === 400) {
            message =
              backendMessage ||
              'Los datos ingresados no son válidos.';
          } else if (error?.status === 401) {
            message =
              'La sesión expiró o no pudo validarse.';
          } else if (error?.status === 403) {
            message =
              backendMessage ||
              'El servidor rechazó una de las operaciones necesarias.';
          } else if (error?.status === 409) {
            message =
              backendMessage ||
              'El código ya pertenece a otro resultado activo.';
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

  /**
   * Crea o actualiza el resultado dependiendo de si
   * el payload contiene un ID.
   */
  private persistResult(payload: Result) {
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

  /**
   * Genera un código histórico único para un registro
   * duplicado que será nuevamente eliminado.
   *
   * Ejemplo:
   * LISTA_ESPERA_DUPLICADO_10
   */
  private buildHistoricalCode(
    originalCode: string,
    duplicateId: number,
  ): string {
    const suffix = `_DUPLICADO_${duplicateId}`;

    /*
     * El campo código admite como máximo 80 caracteres.
     */
    const availableLength =
      80 - suffix.length;

    const baseCode = originalCode
      .substring(0, availableLength)
      .replace(/_+$/g, '');

    return `${baseCode}${suffix}`;
  }

  /**
   * Muestra un cuadro institucional de error.
   */
  private showError(message: string): void {
    this.dialog.open(
      ConfirmDialogOkComponent,
      {
        width: '460px',
        maxWidth: '95vw',
        disableClose: true,
        panelClass: 'rda-confirm-dialog',
        backdropClass: 'app-backdrop',
        data: {
          title: 'No fue posible guardar',
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