import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { finalize } from 'rxjs/operators';
import { merge } from 'rxjs';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '@app/services/catalog-maintainer.service';

import { ConfirmDialogYesNoComponent } from '@app/shared/confirm-dialog/confirm-dialog-yes-no.component';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';

import { AttendanceStatusesDialogComponent } from './attendance-statuses.dialog';

type FilterState = 'active' | 'deleted' | 'all';

@Component({
  standalone: true,
  selector: 'app-attendance-statuses',
  templateUrl: './attendance-statuses.component.html',
  styleUrls: ['./attendance-statuses.component.scss'],
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
    MatDialogModule,
  ],
})
export class AttendanceStatusesComponent implements AfterViewInit {
  private readonly resource = 'attendanceStatuses';

  displayedColumns = [
    'id',
    'name',
    'code',
    'description',
    'active',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'recordStatus',
    'actions',
  ];

  dataSource = new MatTableDataSource<CatalogItem>([]);

  loading = false;
  total = 0;
  q = '';
  filterState: FilterState = 'active';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(CatalogMaintainerService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.paginator.pageIndex = 0;
    this.paginator.pageSize = 10;

    this.sort.active = 'id';
    this.sort.direction = 'asc' as SortDirection;

    this.sort.sortChange.subscribe(() => {
      this.paginator.firstPage();
    });

    merge(this.sort.sortChange, this.paginator.page).subscribe(() => {
      this.load();
    });

    this.load();
    this.cdr.detectChanges();
  }

  load(): void {
    this.loading = true;

    const requestOptions =
      this.filterState === 'deleted'
        ? {
            includeDeleted: true,
            deleted: true,
          }
        : this.filterState === 'all'
          ? {
              includeDeleted: true,
            }
          : {
              includeDeleted: false,
              deleted: false,
            };

    this.api
      .getAll(this.resource, requestOptions)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (response: CatalogItem[]) => {
          const rows = Array.isArray(response) ? response : [];

          let filtered = [...rows];

          /*
           * Se mantiene este filtro local como protección adicional,
           * aunque el backend ya reciba los parámetros correspondientes.
           */
          if (this.filterState === 'active') {
            filtered = filtered.filter((row) => !row.deletedAt);
          }

          if (this.filterState === 'deleted') {
            filtered = filtered.filter((row) => !!row.deletedAt);
          }

          const term = this.normalize(this.q);

          if (term) {
            filtered = filtered.filter((row) => {
              const searchableText = [
                row.id,
                row.name,
                row.code,
                row.description,
              ]
                .filter((value) => value !== null && value !== undefined)
                .join(' ');

              return this.normalize(searchableText).includes(term);
            });
          }

          const sortField = this.sort?.active || 'id';
          const direction = this.sort?.direction || 'asc';

          filtered.sort((a, b) => {
            const first = this.getSortValue(a, sortField);
            const second = this.getSortValue(b, sortField);

            let comparison = 0;

            if (first == null && second != null) {
              comparison = -1;
            } else if (first != null && second == null) {
              comparison = 1;
            } else if (
              typeof first === 'number' &&
              typeof second === 'number'
            ) {
              comparison = first - second;
            } else {
              comparison = String(first ?? '').localeCompare(
                String(second ?? ''),
                'es',
                {
                  numeric: true,
                  sensitivity: 'base',
                },
              );
            }

            return direction === 'asc' ? comparison : -comparison;
          });

          const pageIndex = this.paginator?.pageIndex ?? 0;

          const pageSize = this.paginator?.pageSize ?? 10;

          const start = pageIndex * pageSize;

          this.total = filtered.length;

          this.dataSource.data = filtered.slice(start, start + pageSize);
        },

        error: (error) => {
          console.error(
            '[AttendanceStatuses] Error cargando registros:',
            error,
          );

          this.total = 0;
          this.dataSource.data = [];

          this.showMessage(
            'No fue posible cargar los estados de asistencia.',
            'No fue posible cargar',
            'error',
          );
        },
      });
  }

  applyFilter(term: string): void {
    this.q = term.trim();
    this.paginator.firstPage();
    this.load();
  }

  setState(state: FilterState): void {
    this.filterState = state;
    this.q = '';
    this.paginator.firstPage();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openDialog(row?: CatalogItem): void {
    const ref = this.dialog.open(AttendanceStatusesDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'maintainer-dialog',
      backdropClass: 'app-backdrop',
      data: row ?? null,
    });

    ref.afterClosed().subscribe((saved?: CatalogItem) => {
      if (saved) {
        this.paginator.firstPage();
        this.load();
      }
    });
  }

  softDelete(row: CatalogItem): void {
    if (!row.id) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogYesNoComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar estado de asistencia',
        message:
          `¿Seguro que deseas eliminar “${row.name}” ` + `(ID: ${row.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.loading = true;

      this.api
        .delete(this.resource, Number(row.id))
        .pipe(
          finalize(() => {
            this.loading = false;
          }),
        )
        .subscribe({
          next: () => {
            this.paginator.firstPage();
            this.load();

            this.showMessage(
              'El estado de asistencia fue eliminado correctamente.',
              'Operación realizada',
              'check_circle',
            );
          },
          error: (error) => {
            console.error(
              '[AttendanceStatuses] Error eliminando registro:',
              error,
            );

            this.showMessage(
              this.getErrorMessage(
                error,
                'No fue posible eliminar el estado de asistencia.',
              ),
              'No fue posible eliminar',
              'error',
            );
          },
        });
    });
  }

  restore(row: CatalogItem): void {
    if (!row.id) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogYesNoComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Restaurar estado de asistencia',
        message:
          `¿Seguro que deseas restaurar “${row.name}” ` + `(ID: ${row.id})?`,
        confirmText: 'Restaurar',
        cancelText: 'Cancelar',
        color: 'primary',
        icon: 'restore',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.loading = true;

      this.api
        .restore(this.resource, Number(row.id))
        .pipe(
          finalize(() => {
            this.loading = false;
          }),
        )
        .subscribe({
          next: () => {
            this.paginator.firstPage();
            this.load();

            this.showMessage(
              'El estado de asistencia fue restaurado correctamente.',
              'Operación realizada',
              'check_circle',
            );
          },
          error: (error) => {
            console.error(
              '[AttendanceStatuses] Error restaurando registro:',
              error,
            );

            this.showMessage(
              this.getErrorMessage(
                error,
                'No fue posible restaurar el estado de asistencia.',
              ),
              'No fue posible restaurar',
              'error',
            );
          },
        });
    });
  }

  private getSortValue(row: CatalogItem, field: string): unknown {
    switch (field) {
      case 'id':
        return row.id;

      case 'name':
        return row.name;

      case 'code':
        return row.code;

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

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private getErrorMessage(error: any, fallback: string): string {
    return (
      error?.error?.message || error?.error?.error || error?.message || fallback
    );
  }

  private showMessage(message: string, title: string, icon: string): void {
    this.dialog.open(ConfirmDialogOkComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title,
        message,
        confirmText: 'Aceptar',
        color: icon === 'error' ? 'warn' : 'primary',
        icon,
      },
    });
  }
}
