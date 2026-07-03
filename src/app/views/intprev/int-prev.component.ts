// ============================================================
// ✅ INT PREV COMPONENT
// Mantenedor padre: Tipos de previsión
// ============================================================

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
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';

import { merge } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { IntPrev } from '../../models/int-prev';
import { IntPrevService } from '../../services/int-prev.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { IntPrevDialogComponent } from './int-prev.dialog';

@Component({
  standalone: true,
  selector: 'app-int-prev',
  templateUrl: './int-prev.component.html',
  styleUrls: ['./int-prev.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDialogModule,
    MatCardModule,
  ],
})
export class IntPrevComponent implements AfterViewInit {
  displayedColumns = [
    'id',
    'name',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'estado',
    'acciones',
  ];

  dataSource = new MatTableDataSource<IntPrev>([]);
  loading = false;
  total = 0;
  q = '';
  filterState: 'all' | 'active' | 'deleted' = 'active';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly api = inject(IntPrevService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.sort.active = 'id';
    this.sort.direction = 'asc';
    this.paginator.pageIndex = 0;

    merge(this.sort.sortChange, this.paginator.page).subscribe(() =>
      this.load(),
    );

    this.load();
    this.cdr.detectChanges();
  }

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
          : this.api.getAll();

    request$.pipe(finalize(() => (this.loading = false))).subscribe({
      next: (allRows: IntPrev[]) => {
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
      error: (err) => {
        console.error('[IntPrevComponent] Error cargando tipos de previsión:', err);
        this.dataSource.data = [];
        this.total = 0;
      },
    });
  }

  applyFilter(value: string): void {
    this.q = value.trim();
    this.paginator.firstPage();
    this.load();
  }

  setState(state: 'all' | 'active' | 'deleted'): void {
    this.filterState = state;
    this.paginator.firstPage();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openDialog(row?: IntPrev): void {
    const ref = this.dialog.open(IntPrevDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'maintainer-dialog',
      backdropClass: 'app-backdrop',
      data: row ?? null,
    });

    ref.afterClosed().subscribe((result?: IntPrev) => {
      if (result) {
        queueMicrotask(() => this.load());
      }
    });
  }

  softDelete(row: IntPrev): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar tipo de previsión',
        message: `¿Seguro que deseas eliminar “${row.name}” (ID: ${row.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        this.api.delete(row.id).subscribe(() => this.load());
      }
    });
  }

  restore(row: IntPrev): void {
    this.api.restore(row.id).subscribe(() => this.load());
  }

  isDeleted(row: IntPrev): boolean {
    return !!row.deletedAt;
  }

  private mapSortField(field?: string): string {
    switch (field) {
      case 'id':
      case 'name':
      case 'createdAt':
      case 'updatedAt':
      case 'deletedAt':
        return field;
      default:
        return 'id';
    }
  }

  private getFieldValue(row: IntPrev, field: string): unknown {
    return (row as any)[field];
  }
}