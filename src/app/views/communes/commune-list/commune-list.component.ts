import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// ⚠️ Ajusta la ruta del servicio si lo tienes en otro lugar
import { CommuneService } from '../../../services/comunes.service';

export interface Commune {
  id: number | string;
  name?: string;      // o 'nombre' según tu API
  region?: string;
  // agrega campos si los necesitas
}

/** Variantes de paginado soportadas */
type PageSpring<T> = { content: T[]; totalElements: number };
type PageAlt<T> = { items: T[]; total: number };
type PageLike<T> = PageSpring<T> | PageAlt<T> | T[];

/** Normaliza a { data, total } */
function normalizePage<T>(res: PageLike<T>): { data: T[]; total: number } {
  if (Array.isArray(res)) return { data: res, total: res.length };
  if ('content' in res) return { data: res.content, total: res.totalElements };
  if ('items' in res) return { data: (res as PageAlt<T>).items, total: (res as PageAlt<T>).total };
  return { data: [], total: 0 };
}

@Component({
  standalone: true,
  selector: 'app-commune-list',
  templateUrl: './commune-list.component.html',
  imports: [
    CommonModule,
    MatDividerModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ]
})
export class CommuneListComponent implements OnInit {
  private communeService = inject(CommuneService);

  // Tabla
  displayedColumns: string[] = ['id', 'name', 'actions'];
  rows: Commune[] = [];

  // Paginación (coinciden con lo que tu HTML estaba usando)
  totalElements = 0;
  pageIndex = 0;
  pageSize = 5;

  // UI
  loading = false;
  error = '';

  ngOnInit(): void {
    this.loadPage(this.pageIndex, this.pageSize);
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPage(this.pageIndex, this.pageSize);
  }

  loadPage(page = 0, size = 5) {
    this.loading = true;
    this.error = '';
    this.rows = [];

    // Si tu API no es paginada, sustituye por listAll() y adapta asignaciones
    //this.communeService.listPaginated(page, size).subscribe({
    this.communeService.listPaginated({ page, size }).subscribe({
      next: (res: unknown) => {
        const { data, total } = normalizePage<Commune>(res as any);
        this.rows = data;
        this.totalElements = total;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor. Verifica IP/puerto/red.';
        } else {
          this.error = `Error ${err.status}: ${err.statusText || 'Solicitud fallida'}`;
        }
        console.error('Communes load error:', err);
        this.loading = false;
      }
    });
  }

  edit(row: Commune) {
    console.log('edit', row);
  }

  remove(row: Commune) {
    console.log('remove', row);
  }
}
