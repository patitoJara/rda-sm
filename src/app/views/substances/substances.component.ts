import {
  Component,
  AfterViewInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { merge } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Substance } from '../../models/substance';
import { SubstanceService } from '../../services/substance.service';
import { SubstancesDialogComponent } from './substances.dialog';

@Component({
  standalone: true,
  selector: 'app-substances',
  templateUrl: './substances.component.html',
  styleUrls: ['./substances.component.scss'],
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
export class SubstancesComponent implements AfterViewInit {
  displayedColumns = [
    'id',
    'name',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'estado',
    'acciones',
  ];
  dataSource = new MatTableDataSource<Substance>([]);
  loading = false;
  total = 0;

  /** Filtro por nombre */
  q = '';

  /** Estado: all = todos, active = no eliminados, deleted = eliminados */
  filterState: 'all' | 'active' | 'deleted' = 'active';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(SubstanceService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.paginator.pageIndex = 0;
    this.paginator.pageSize = 10;

    this.sort.active = 'id';
    this.sort.direction = 'asc' as SortDirection;

    this.sort.sortChange.subscribe(() => this.paginator.firstPage());
    merge(this.sort.sortChange, this.paginator.page).subscribe(() =>
      this.load(),
    );

    this.load();
    this.cdr.detectChanges();
  }

  /** Mapeo de campos para ordenar */
  private mapSortField(active?: string): string {
    switch (active) {
      case 'id':
        return 'id';
      case 'name':
        return 'name';
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

  /** Cargar sustancias desde backend */
  /** Cargar sustancias desde backend */
  load(): void {
    this.loading = true;

    const page = this.paginator?.pageIndex ?? 0;
    const size = this.paginator?.pageSize ?? 10;

    const active = this.sort?.active;
    const direction = (this.sort?.direction as '' | 'asc' | 'desc') || 'asc';
    const sortField = this.mapSortField(active);

    const request$ =
      this.filterState === 'deleted'
        ? this.api.getDeleted()
        : this.filterState === 'all'
          ? this.api.getAll()
          : this.api.listAll();

    request$.pipe(finalize(() => (this.loading = false))).subscribe({
      next: (allRows: Substance[]) => {
        let filtered = allRows;

        if (this.filterState === 'active') {
          filtered = allRows.filter((r) => !r.deletedAt);
        } else if (this.filterState === 'deleted') {
          filtered = allRows.filter((r) => !!r.deletedAt);
        }

        const term = (this.q || '').toLowerCase();
        if (term) {
          filtered = filtered.filter((r) =>
            (r.name ?? '').toLowerCase().includes(term),
          );
        }

        filtered.sort((a, b) => {
          const va = this.getFieldValue(a, sortField);
          const vb = this.getFieldValue(b, sortField);

          let cmp = 0;

          if (va == null && vb != null) {
            cmp = -1;
          } else if (va != null && vb == null) {
            cmp = 1;
          } else if (typeof va === 'number' && typeof vb === 'number') {
            cmp = va - vb;
          } else {
            cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'es', {
              numeric: true,
              sensitivity: 'base',
            });
          }

          return direction === 'asc' ? cmp : -cmp;
        });

        const start = page * size;
        const slice = filtered.slice(start, start + size);

        this.dataSource.data = slice;
        this.total = filtered.length;
      },
      error: () => {
        this.dataSource.data = [];
        this.total = 0;
      },
    });
  }

  /** Obtener valor para ordenar */
  private getFieldValue(row: Substance, field: string): any {
    switch (field) {
      case 'id':
        return row.id;
      case 'name':
        return row.name;
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

  /** Buscar por nombre */
  applyFilter(term: string): void {
    this.q = term.trim();
    this.paginator.firstPage();
    this.load();
  }

  /** Cambiar estado (Activos / Eliminados / Todos) */
  setState(state: 'all' | 'active' | 'deleted'): void {
    this.q = '';
    this.filterState = state;
    this.paginator.firstPage();
    this.load();
  }

  /** Recargar tabla */
  refresh(): void {
    this.load();
  }

  /** Diálogo crear / editar */
  openDialog(row?: Substance): void {
    setTimeout(() => {
      const ref = this.dialog.open(SubstancesDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        panelClass: 'maintainer-dialog',
        backdropClass: 'app-backdrop',
        data: row ?? null,
      });

      ref.afterClosed().subscribe((result?: Substance) => {
        if (result) {
          queueMicrotask(() => this.load());
        }
      });
    });
  }

  /** Eliminar sustancia */
  softDelete(row: Substance): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar sustancia',
        message: `¿Seguro que deseas eliminar “${row.name}” (ID: ${row.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        this.api.delete(Number(row.id)).subscribe(() => this.load());
      }
    });
  }

  /** Restaurar sustancia eliminada */
  restore(row: Substance): void {
    this.api.restore(Number(row.id)).subscribe(() => this.load());
  }
}
