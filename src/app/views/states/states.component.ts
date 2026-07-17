import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';

import {
  MatPaginator,
  MatPaginatorModule,
} from '@angular/material/paginator';

import {
  MatSort,
  MatSortModule,
  SortDirection,
} from '@angular/material/sort';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import {
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';

import { merge } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { State } from '../../models/state';
import { StateService } from '../../services/state.service';

import { StatesDialogComponent } from './states.dialog';

import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';

import { ConfirmDialogYesNoComponent } from '@app/shared/confirm-dialog/confirm-dialog-yes-no.component';

@Component({
  standalone: true,
  selector: 'app-states',
  templateUrl: './states.component.html',
  styleUrls: ['./states.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDialogModule,
  ],
})
export class StatesComponent implements AfterViewInit {
  displayedColumns = [
    'id',
    'name',
    'code',
    'scope',
    'description',
    'active',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'estado',
    'acciones',
  ];

  dataSource = new MatTableDataSource<State>([]);

  loading = false;
  total = 0;

  q = '';

  filterState:
    | 'all'
    | 'active'
    | 'deleted' = 'active';

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  @ViewChild(MatSort)
  sort!: MatSort;

  private api = inject(StateService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.paginator.pageIndex = 0;
    this.paginator.pageSize = 10;

    this.sort.active = 'id';
    this.sort.direction =
      'asc' as SortDirection;

    this.sort.sortChange.subscribe(() =>
      this.paginator.firstPage(),
    );

    merge(
      this.sort.sortChange,
      this.paginator.page,
    ).subscribe(() => this.load());

    this.load();
    this.cdr.detectChanges();
  }

  private mapSortField(
    active?: string,
  ): string {
    switch (active) {
      case 'id':
        return 'id';

      case 'name':
        return 'name';

      case 'code':
        return 'code';

      case 'scope':
        return 'scope';

      case 'active':
        return 'active';

      case 'createdAt':
        return 'createdAt';

      case 'updatedAt':
        return 'updatedAt';

      case 'deletedAt':
        return 'deletedAt';

      default:
        return 'id';
    }
  }

  load(): void {
    this.loading = true;

    const page =
      this.paginator?.pageIndex ?? 0;

    const size =
      this.paginator?.pageSize ?? 10;

    const active =
      this.sort?.active;

    const direction =
      (this.sort?.direction as
        | ''
        | 'asc'
        | 'desc') || 'asc';

    const sortField =
      this.mapSortField(active);

    const request$ =
      this.filterState === 'deleted'
        ? this.api.getDeleted()
        : this.filterState === 'all'
          ? this.api.getAll()
          : this.api.listAll();

    request$
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res: any) => {
          const allRows: State[] =
            Array.isArray(res)
              ? res
              : (res?.content ?? []);

          let filtered = allRows;

          if (
            this.filterState === 'active'
          ) {
            filtered = allRows.filter(
              (row) => !row.deletedAt,
            );
          } else if (
            this.filterState === 'deleted'
          ) {
            filtered = allRows.filter(
              (row) => !!row.deletedAt,
            );
          }

          const term = this.q
            .trim()
            .toLowerCase();

          if (term) {
            filtered = filtered.filter(
              (row) => {
                const searchableText = [
                  row.name,
                  row.code,
                  row.scope,
                  row.description,
                ]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();

                return searchableText.includes(
                  term,
                );
              },
            );
          }

          filtered.sort((a, b) => {
            const va =
              this.getFieldValue(
                a,
                sortField,
              );

            const vb =
              this.getFieldValue(
                b,
                sortField,
              );

            let cmp = 0;

            if (
              va == null &&
              vb != null
            ) {
              cmp = -1;
            } else if (
              va != null &&
              vb == null
            ) {
              cmp = 1;
            } else if (
              typeof va === 'number' &&
              typeof vb === 'number'
            ) {
              cmp = va - vb;
            } else {
              cmp = String(
                va ?? '',
              ).localeCompare(
                String(vb ?? ''),
                'es',
                {
                  numeric: true,
                  sensitivity: 'base',
                },
              );
            }

            return direction === 'asc'
              ? cmp
              : -cmp;
          });

          const start =
            page * size;

          const slice =
            filtered.slice(
              start,
              start + size,
            );

          this.dataSource.data =
            slice;

          this.total =
            filtered.length;
        },

        error: (error) => {
          console.error(
            '[StatesComponent] Error cargando estados:',
            error,
          );

          this.dataSource.data = [];
          this.total = 0;

          this.showMessage(
            'No fue posible cargar los estados.',
            'Error al cargar',
            'error',
            'warn',
          );
        },
      });
  }

  private getFieldValue(
    row: State,
    field: string,
  ): any {
    switch (field) {
      case 'id':
        return row.id;

      case 'name':
        return row.name;

      case 'code':
        return row.code;

      case 'scope':
        return row.scope;

      case 'active':
        return row.active;

      case 'createdAt':
        return row.createdAt;

      case 'updatedAt':
        return row.updatedAt;

      case 'deletedAt':
        return row.deletedAt;

      default:
        return row.id;
    }
  }

  applyFilter(term: string): void {
    this.q = term.trim();
    this.paginator.firstPage();
    this.load();
  }

  setState(
    state:
      | 'all'
      | 'active'
      | 'deleted',
  ): void {
    this.q = '';
    this.filterState = state;

    this.paginator.firstPage();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openDialog(row?: State): void {
    setTimeout(() => {
      const ref =
        this.dialog.open(
          StatesDialogComponent,
          {
            width: '560px',
            maxWidth: '95vw',
            panelClass:
              'maintainer-dialog',
            backdropClass:
              'app-backdrop',
            data: row ?? null,
          },
        );

      ref
        .afterClosed()
        .subscribe(
          (result?: State) => {
            if (result) {
              queueMicrotask(() =>
                this.load(),
              );
            }
          },
        );
    });
  }

  softDelete(row: State): void {
    const ref =
      this.dialog.open(
        ConfirmDialogYesNoComponent,
        {
          width: '460px',
          maxWidth: '95vw',
          disableClose: true,
          panelClass:
            'rda-confirm-dialog',
          backdropClass:
            'app-backdrop',
          data: {
            title: 'Eliminar estado',
            message:
              `¿Seguro que deseas eliminar ` +
              `“${row.name}” ` +
              `(ID: ${row.id})?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            color: 'warn',
            icon: 'delete',
          },
        },
      );

    ref
      .afterClosed()
      .subscribe((ok: boolean) => {
        if (!ok) {
          return;
        }

        this.loading = true;

        this.api
          .delete(Number(row.id))
          .pipe(
            finalize(() => {
              this.loading = false;
            }),
          )
          .subscribe({
            next: () => {
              this.showMessage(
                'Estado eliminado correctamente.',
                'Operación exitosa',
                'check_circle',
                'primary',
              );

              this.paginator.firstPage();
              this.load();
            },

            error: (error) => {
              console.error(
                '[StatesComponent] Error eliminando estado:',
                error,
              );

              this.showMessage(
                error?.error?.message ||
                  'No fue posible eliminar el estado.',
                'No fue posible eliminar',
                'error',
                'warn',
              );
            },
          });
      });
  }

  restore(row: State): void {
    const ref =
      this.dialog.open(
        ConfirmDialogYesNoComponent,
        {
          width: '460px',
          maxWidth: '95vw',
          disableClose: true,
          panelClass:
            'rda-confirm-dialog',
          backdropClass:
            'app-backdrop',
          data: {
            title: 'Restaurar estado',
            message:
              `¿Seguro que deseas restaurar ` +
              `“${row.name}” ` +
              `(ID: ${row.id})?`,
            confirmText: 'Restaurar',
            cancelText: 'Cancelar',
            color: 'primary',
            icon:
              'settings_backup_restore',
          },
        },
      );

    ref
      .afterClosed()
      .subscribe((ok: boolean) => {
        if (!ok) {
          return;
        }

        this.loading = true;

        this.api
          .restore(Number(row.id))
          .pipe(
            finalize(() => {
              this.loading = false;
            }),
          )
          .subscribe({
            next: () => {
              this.showMessage(
                'Estado restaurado correctamente.',
                'Operación exitosa',
                'check_circle',
                'primary',
              );

              this.filterState =
                'active';

              this.paginator.firstPage();
              this.load();
            },

            error: (error) => {
              console.error(
                '[StatesComponent] Error restaurando estado:',
                error,
              );

              this.showMessage(
                error?.error?.message ||
                  'No fue posible restaurar el estado.',
                'No fue posible restaurar',
                'error',
                'warn',
              );
            },
          });
      });
  }

  private showMessage(
    message: string,
    title: string,
    icon: string,
    color:
      | 'primary'
      | 'accent'
      | 'warn',
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
          title,
          message,
          confirmText: 'Aceptar',
          color,
          icon,
        },
      },
    );
  }
}