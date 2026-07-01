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
import { ContactType } from '../../models/contact.type';
import { ContactTypesDialogComponent } from './contact.type.dialog';
import { ContactTypeService } from '../../services/contact.type.service';

@Component({
  standalone: true,
  selector: 'app-contacttypes',
  templateUrl: './contact.type.html',
  styleUrls: ['./contact.type.scss'],
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
export class TypeContactComponent implements AfterViewInit {
  displayedColumns = [
    'id',
    'name',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'estado',
    'acciones',
  ];
  dataSource = new MatTableDataSource<ContactType>([]);
  loading = false;
  total = 0;

  /** Filtro por nombre de ContactType (independiente del estado) */
  q = '';

  /** Filtro por estado que controla el endpoint */
  filterState: 'all' | 'active' | 'deleted' = 'active';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(ContactTypeService);
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

  /** ÚNICO lugar que pega a la API y pinta la tabla */
  /** Cargar tipos de contacto desde backend */
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
      next: (allRows: ContactType[]) => {
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

  /** Obtener el valor de campo para ordenar en cliente */
  private getFieldValue(row: ContactType, field: string): any {
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

  /** Filtro de comuna (independiente del estado) → solo actualiza y recarga */
  applyFilter(term: string): void {
    this.q = term.trim();
    //this.filterState='active';
    this.paginator.firstPage();
    this.load();
  }

  /** Cambio de estado (chips) → no toca el filtro de nombre */
  setState(state: 'all' | 'active' | 'deleted'): void {
    this.q = '';
    this.filterState = state;
    this.paginator.firstPage();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openDialog(row?: ContactType): void {
    setTimeout(() => {
      const ref = this.dialog.open(ContactTypesDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        panelClass: 'maintainer-dialog',
        backdropClass: 'app-backdrop',
        data: row ?? null,
      });

      ref.afterClosed().subscribe((result?: ContactType) => {
        if (result) {
          queueMicrotask(() => this.load());
        }
      });
    });
  }

  softDelete(row: ContactType): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar tipo de contacto',
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
  restore(row: ContactType): void {
    this.api.restore(Number(row.id)).subscribe(() => this.load());
  }
}
