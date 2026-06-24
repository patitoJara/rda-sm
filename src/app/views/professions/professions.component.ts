import { Component, AfterViewInit, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
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

import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Profession } from '../../models/profession';
import { ProfessionService } from '../../services/profession.service';
import { ProfessionsDialogComponent } from './professions.dialog';

@Component({
  standalone: true,
  selector: 'app-professions',
  templateUrl: './professions.component.html',
  styleUrls: ['./professions.component.scss'],
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
export class ProfessionsComponent implements AfterViewInit {
  displayedColumns = ['id', 'name', 'createdAt', 'updatedAt', 'deletedAt', 'estado', 'acciones'];

  dataSource = new MatTableDataSource<Profession>([]);
  loading = false;
  total = 0;

  q = '';
  filterState: 'all' | 'active' | 'deleted' = 'active';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(ProfessionService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.paginator.pageIndex = 0;
    this.paginator.pageSize = 10;

    this.sort.active = 'id';
    this.sort.direction = 'asc' as SortDirection;

    this.sort.sortChange.subscribe(() => this.paginator.firstPage());
    merge(this.sort.sortChange, this.paginator.page).subscribe(() => this.load());

    this.load();
    this.cdr.detectChanges();
  }

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

  load(): void {
    this.loading = true;

    const page = this.paginator?.pageIndex ?? 0;
    const size = this.paginator?.pageSize ?? 10;

    const active = this.sort?.active;
    const direction = (this.sort?.direction as '' | 'asc' | 'desc') || 'asc';
    const sortField = this.mapSortField(active);

    this.api.getAllPaginated({ page, size })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const allRows: Profession[] = Array.isArray(res) ? res : (res?.content ?? []);

          let filtered = allRows;

          if (this.filterState === 'active') {
            filtered = allRows.filter((r) => !r.deletedAt);
          } else if (this.filterState === 'deleted') {
            filtered = allRows.filter((r) => !!r.deletedAt);
          }

          const term = (this.q || '').toLowerCase();

          if (term) {
            filtered = filtered.filter((r) =>
              (r.name ?? '').toLowerCase().includes(term)
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
        error: (err) => console.error('Error cargando profesiones:', err),
      });
  }

  private getFieldValue(row: Profession, field: string): any {
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

  applyFilter(term: string): void {
    this.q = term.trim();
    this.paginator.firstPage();
    this.load();
  }

  setState(state: 'all' | 'active' | 'deleted'): void {
    this.q = '';
    this.filterState = state;
    this.paginator.firstPage();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openDialog(row?: Profession): void {
    setTimeout(() => {
      const ref = this.dialog.open(ProfessionsDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        panelClass: 'substances-dialog',
        backdropClass: 'app-backdrop',
        data: row ?? null,
      });

      ref.afterClosed().subscribe((result?: Profession) => {
        if (result) {
          queueMicrotask(() => this.load());
        }
      });
    });
  }

  softDelete(row: Profession): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Eliminar profesión',
        message: `¿Seguro que deseas eliminar la profesión “${row.name}” (ID: ${row.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
        dense: true,
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        this.api.delete(Number(row.id)).subscribe(() => this.load());
      }
    });
  }

  restore(row: Profession): void {
    this.api.restore(Number(row.id)).subscribe(() => this.load());
  }
}