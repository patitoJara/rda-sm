import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '../../services/catalog-maintainer.service';

import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { EpisodeTypesDialogComponent } from './episode-types.dialog';

type EpisodeTypeFilterState = 'active' | 'inactive' | 'deleted' | 'all';

@Component({
  selector: 'app-episode-types',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './episode-types.component.html',
  styleUrls: ['./episode-types.component.scss'],
})
export class EpisodeTypesComponent implements AfterViewInit {
  private readonly catalogService = inject(CatalogMaintainerService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly resource = 'episodeTypes';

  readonly displayedColumns = [
    'id',
    'code',
    'name',
    'description',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'estado',
    'acciones',
  ];

  dataSource = new MatTableDataSource<CatalogItem>([]);

  loading = false;
  total = 0;
  q = '';

  filterState: EpisodeTypeFilterState = 'active';

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  @ViewChild(MatSort)
  sort!: MatSort;

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (
      item: CatalogItem,
      property: string,
    ): string | number => {
      const value = this.getFieldValue(item, property);

      if (typeof value === 'number') {
        return value;
      }

      return this.normalizeSearch(value);
    };

    this.sort.active = 'id';
    this.sort.direction = 'asc';

    this.loadItems();
    this.cdr.detectChanges();
  }

  loadItems(): void {
    this.loading = true;

    this.resolveRequest()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => {
          let filtered = [...rows];

          if (this.filterState === 'active') {
            filtered = filtered.filter(
              (item) => !this.isDeleted(item) && item.active !== false,
            );
          } else if (this.filterState === 'inactive') {
            filtered = filtered.filter((item) => this.isInactive(item));
          } else if (this.filterState === 'deleted') {
            filtered = filtered.filter((item) => this.isDeleted(item));
          }

          const term = this.normalizeSearch(this.q);

          if (term) {
            filtered = filtered.filter((item) => {
              const searchableText = this.normalizeSearch(
                [item.id, item.code, item.name, item.description].join(' '),
              );

              return searchableText.includes(term);
            });
          }

          this.total = filtered.length;
          this.dataSource.data = filtered;
        },
        error: (error) => {
          console.error('[EpisodeTypes] Error cargando registros:', error);

          this.dataSource.data = [];
          this.total = 0;

          this.showWarning(
            'No fue posible cargar los tipos de episodio',
            this.getLoadErrorMessage(error),
          );
        },
      });
  }

  applyFilter(term: string): void {
    this.q = term.trim();
    this.paginator.firstPage();
    this.loadItems();
  }

  clearFilter(): void {
    this.q = '';
    this.paginator.firstPage();
    this.loadItems();
  }

  setState(state: EpisodeTypeFilterState): void {
    this.q = '';
    this.filterState = state;
    this.paginator.firstPage();
    this.loadItems();
  }

  refresh(): void {
    this.loadItems();
  }

  openDialog(item?: CatalogItem): void {
    if (item && this.isDeleted(item)) {
      this.showWarning(
        'Tipo de episodio eliminado',
        'El registro debe restaurarse antes de poder ser modificado.',
      );
      return;
    }

    const ref = this.dialog.open(EpisodeTypesDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: 'maintainer-dialog',
      backdropClass: 'app-backdrop',
      data: {
        item: item ?? null,
        resource: this.resource,
      },
    });

    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.loadItems();
      }
    });
  }

  deleteItem(item: CatalogItem): void {
    if (!item.id) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar tipo de episodio',
        message:
          `Se eliminará “${item.name}” (ID: ${item.id}). ` +
          'El tipo dejará de estar disponible para crear nuevos episodios, ' +
          'pero los antecedentes históricos conservarán su referencia. ' +
          '¿Deseas continuar?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
        dense: true,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || !item.id) {
        return;
      }

      this.loading = true;

      this.catalogService
        .delete(this.resource, item.id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => {
            this.loadItems();
          },
          error: (error) => {
            console.error('[EpisodeTypes] Error eliminando registro:', error);

            this.showWarning(
              'No fue posible eliminar el tipo de episodio',
              this.getDeleteErrorMessage(error, item),
            );
          },
        });
    });
  }

  restoreItem(item: CatalogItem): void {
    if (!item.id) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Restaurar tipo de episodio',
        message:
          `Se restaurará “${item.name}” (ID: ${item.id}). ` +
          'El registro volverá a estar disponible en el mantenedor. ' +
          '¿Deseas continuar?',
        confirmText: 'Restaurar',
        cancelText: 'Cancelar',
        color: 'primary',
        icon: 'settings_backup_restore',
        dense: true,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || !item.id) {
        return;
      }

      this.loading = true;

      this.catalogService
        .restore(this.resource, item.id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => {
            this.loadItems();
          },
          error: (error) => {
            console.error('[EpisodeTypes] Error restaurando registro:', error);

            this.showWarning(
              'No fue posible restaurar el tipo de episodio',
              this.getRestoreErrorMessage(error, item),
            );
          },
        });
    });
  }

  isDeleted(item: CatalogItem): boolean {
    return !!item.deletedAt;
  }

  isInactive(item: CatalogItem): boolean {
    return !this.isDeleted(item) && item.active === false;
  }

  private resolveRequest(): Observable<CatalogItem[]> {
    if (this.filterState === 'inactive') {
      return this.catalogService.getInactive(this.resource);
    }

    if (this.filterState === 'deleted') {
      return this.catalogService.getDeleted(this.resource);
    }

    return this.catalogService.getAllRaw(this.resource);
  }

  private getFieldValue(
    item: CatalogItem,
    field: string,
  ): string | number | null | undefined {
    switch (field) {
      case 'id':
        return item.id;
      case 'code':
        return item.code;
      case 'name':
        return item.name;
      case 'description':
        return item.description;
      case 'createdAt':
        return item.createdAt;
      case 'updatedAt':
        return item.updatedAt;
      case 'deletedAt':
        return item.deletedAt;
      default:
        return item.id;
    }
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private getLoadErrorMessage(error: unknown): string {
    const status = this.getHttpStatus(error);

    if (status === 0) {
      return 'No fue posible establecer conexión con el servidor. Verifique la disponibilidad del servicio e intente nuevamente.';
    }

    if (status === 403) {
      return 'Su perfil no cuenta con permisos para consultar este mantenedor.';
    }

    return 'Ocurrió un problema al consultar los tipos de episodio. Intente actualizar el listado.';
  }

  private getDeleteErrorMessage(error: unknown, item: CatalogItem): string {
    const status = this.getHttpStatus(error);

    if (status === 0) {
      return 'No fue posible establecer conexión con el servidor. El registro no fue eliminado.';
    }

    if (status === 403) {
      return 'Su perfil no cuenta con permisos para eliminar tipos de episodio.';
    }

    if (status === 404) {
      return `El tipo de episodio “${item.name}” ya no existe o fue eliminado previamente.`;
    }

    if (status === 409) {
      return (
        `El tipo de episodio “${item.name}” no puede eliminarse porque ` +
        'mantiene relaciones que deben conservarse. Revise si está asociado a episodios registrados.'
      );
    }

    return (
      `No fue posible eliminar “${item.name}”. ` +
      'El servidor rechazó la operación o presentó un error interno.'
    );
  }

  private getRestoreErrorMessage(error: unknown, item: CatalogItem): string {
    const status = this.getHttpStatus(error);

    if (status === 0) {
      return 'No fue posible establecer conexión con el servidor. El registro no fue restaurado.';
    }

    if (status === 403) {
      return 'Su perfil no cuenta con permisos para restaurar tipos de episodio.';
    }

    if (status === 404) {
      return `El tipo de episodio “${item.name}” ya no se encuentra disponible para restauración.`;
    }

    if (status === 409) {
      return (
        `No es posible restaurar “${item.name}” porque existe otro registro ` +
        `con el código “${item.code ?? 'sin código'}”. Revise el catálogo antes de continuar.`
      );
    }

    return (
      `No fue posible restaurar “${item.name}”. ` +
      'El servidor rechazó la operación o presentó un error interno.'
    );
  }

  private getHttpStatus(error: unknown): number | null {
    return error instanceof HttpErrorResponse ? error.status : null;
  }

  private showWarning(title: string, message: string): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title,
        message,
        confirmText: 'Aceptar',
        cancelText: '',
        icon: 'warning',
        color: 'warn',
        onlyConfirm: true,
      },
    });
  }
}
