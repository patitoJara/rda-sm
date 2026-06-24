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
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { merge } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';

import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ConvPrev } from '../../models/conv-prev';
import { ConvPrevService } from '../../services/conv-prev.service';
import { ConvPrevDialogComponent } from './conv-prev.dialog';
import { IntPrevService } from '../../services/int-prev.service';
import { IntPrev } from '../../models/int-prev';

@Component({
  standalone: true,
  selector: 'app-conv-prev',
  templateUrl: './conv-prev.component.html',
  styleUrls: ['./conv-prev.component.scss'],
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
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
  ],
})
export class ConvPrevComponent implements AfterViewInit {
  intPrevList: IntPrev[] = [];
  allConvPrev: ConvPrev[] = [];

  displayedColumns = [
    'id',
    'name',
    'intPrev',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'estado',
    'acciones',
  ];

  dataSource = new MatTableDataSource<ConvPrev>([]);
  loading = false;
  total = 0;
  selectedIntPrev: number | null = null;
  q = '';
  filterState: 'all' | 'active' | 'deleted' = 'active';
  filterIntPrev: number | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private api = inject(ConvPrevService);
  private intPrevApi = inject(IntPrevService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.sort.active = 'id';
    this.sort.direction = 'asc';
    this.paginator.pageIndex = 0;

    merge(this.sort.sortChange, this.paginator.page).subscribe(() =>
      this.load(),
    );

    this.loadIntPrev();
    this.load();

    this.cdr.detectChanges();
  }

  loadIntPrev(): void {
    this.intPrevApi.getAll().subscribe({
      next: (res) => {
        this.intPrevList = res;

        // ⭐ Seleccionar automáticamente el primero (Fonasa)
        if (res.length > 0) {
          this.selectedIntPrev = res[0].id;
          this.setIntPrevFilter({ value: this.selectedIntPrev } as any);
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.dataSource.data = [];
        this.total = 0;
      },
    });
  }

  setIntPrevFilter(ev: { value: number | null }) {
    this.filterIntPrev = ev.value;
    this.paginator.firstPage();
    this.load();
  }

  load(): void {
    this.loading = true;

    const page = this.paginator?.pageIndex ?? 0;
    const size = this.paginator?.pageSize ?? 10;

    this.api
      .getAllPaginated(0, 5000, this.q) // ⚡ Siempre cargo TODO
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const rows: ConvPrev[] = Array.isArray(res)
            ? res
            : (res?.content ?? []);

          // Copia completa
          let filtered = [...rows];

          // Estado
          if (this.filterState === 'active')
            filtered = filtered.filter((r) => !r.deletedAt);
          else if (this.filterState === 'deleted')
            filtered = filtered.filter((r) => r.deletedAt);

          // Tipo (Fonasa / Isapre)
          if (this.filterIntPrev !== null) {
            filtered = filtered.filter(
              (r) => r.intPrev?.id === this.filterIntPrev,
            );
          }

          // Búsqueda
          if (this.q.trim().length > 0) {
            const t = this.q.toLowerCase();
            filtered = filtered.filter(
              (r) =>
                (r.name ?? '').toLowerCase().includes(t) ||
                (r.intPrev?.name ?? '').toLowerCase().includes(t),
            );
          }

          // Orden
          const dir = this.sort.direction === 'asc' ? 1 : -1;
          const col = this.sort.active;

          filtered.sort((a, b) => {
            const col = this.sort.active;
            const dir = this.sort.direction === 'asc' ? 1 : -1;

            let va: any;
            let vb: any;

            if (col === 'intPrev') {
              va = a.intPrev?.name ?? '';
              vb = b.intPrev?.name ?? '';
            } else {
              va = (a as any)[col] ?? '';
              vb = (b as any)[col] ?? '';
            }

            // ⭐ SORT NUMÉRICO PARA ID
            if (col === 'id') {
              return (Number(va) - Number(vb)) * dir;
            }

            // ⭐ SORT ALFABÉTICO PARA TODO LO DEMÁS
            return String(va).localeCompare(String(vb), 'es') * dir;
          });

          // 🔥 SIEMPRE ir a página 0 después de cambios para evitar perder datos
          this.paginator.pageIndex = 0;

          // Paginación final
          const start = this.paginator.pageIndex * size;
          this.dataSource.data = filtered.slice(start, start + size);

          this.total = filtered.length;

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error cargando ConvPrev:', err),
      });
  }

  applyFilter(t: string) {
    this.q = t.trim();
    this.paginator.firstPage();
    this.load();
  }

  setState(s: 'all' | 'active' | 'deleted') {
    this.filterState = s;
    this.paginator.firstPage();
    this.load();
  }

  refresh() {
    this.load();
  }

  openDialog(row?: ConvPrev): void {
    const selectedTypeId = this.filterIntPrev;

    const ref = this.dialog.open(ConvPrevDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'maintainer-dialog',
      backdropClass: 'app-backdrop',
      data: {
        row: row ?? null,
        intPrevId: row?.intPrev?.id ?? selectedTypeId,
      },
    });

    ref.afterClosed().subscribe((res?: ConvPrev) => {
      if (res) {
        queueMicrotask(() => this.load());
      }
    });
  }

  softDelete(row: ConvPrev): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar previsión',
        message: `¿Seguro que deseas eliminar “${row.name}” (ID: ${row.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        this.api.softDelete(row.id).subscribe(() => this.load());
      }
    });
  }

  restore(row: ConvPrev) {
    this.api.restore(row.id).subscribe(() => this.load());
  }
}
