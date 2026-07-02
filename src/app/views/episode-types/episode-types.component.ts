import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { firstValueFrom } from 'rxjs';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '../../services/catalog-maintainer.service';

import { EpisodeTypesDialogComponent } from './episode-types.dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-episode-types',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTableModule,
  ],
  templateUrl: './episode-types.component.html',
  styleUrls: ['./episode-types.component.scss'],
})
export class EpisodeTypesComponent implements OnInit {
  private catalogService = inject(CatalogMaintainerService);
  private dialog = inject(MatDialog);

  readonly resource = 'episodeTypes';

  items: CatalogItem[] = [];
  loading = false;

  filterState: 'active' | 'deleted' | 'all' = 'active';

  displayedColumns = [
    'id',
    'code',
    'name',
    'description',
    'estado',
    'acciones',
  ];
  dataSource = new MatTableDataSource<CatalogItem>([]);

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.loading = true;

    try {
      const active =
        this.filterState === 'active'
          ? true
          : this.filterState === 'deleted'
            ? false
            : undefined;

      const res = await firstValueFrom(
        this.catalogService.getAllPaginated(this.resource, {
          page: 0,
          size: 1000,
          active,
          sort: 'id,asc',
        }),
      );

      const rows: CatalogItem[] = Array.isArray(res)
        ? res
        : (res?.content ?? []);

      this.items = rows;
      this.dataSource.data = this.items;
    } catch (error) {
      console.error('[EpisodeTypes] Error cargando registros:', error);
      this.items = [];
      this.dataSource.data = [];
    } finally {
      this.loading = false;
    }
  }

  setState(state: 'active' | 'deleted' | 'all'): void {
    this.filterState = state;
    this.loadItems();
  }

  openDialog(item?: CatalogItem): void {
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

  async deleteItem(item: CatalogItem): Promise<void> {
    if (!item.id) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      data: {
        title: 'Eliminar tipo de episodio',
        message: `¿Seguro que deseas eliminar “${item.name}” (ID: ${item.id})?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'delete',
        dense: true,
      },
    });

    ref.afterClosed().subscribe(async (ok: boolean) => {
      if (!ok || !item.id) {
        return;
      }

      try {
        await firstValueFrom(
          this.catalogService.delete(this.resource, item.id),
        );
        await this.loadItems();
      } catch (error) {
        console.error('[EpisodeTypes] Error eliminando:', error);
        this.showWarning('No fue posible eliminar el registro.');
      }
    });
  }

  async restoreItem(item: CatalogItem): Promise<void> {
    if (!item.id) {
      return;
    }

    try {
      await firstValueFrom(this.catalogService.restore(this.resource, item.id));
      await this.loadItems();
    } catch (error) {
      console.error('[EpisodeTypes] Error restaurando:', error);
      this.showWarning('No fue posible restaurar el registro.');
    }
  }

  isDeleted(item: CatalogItem): boolean {
    return !!item.deletedAt || item.active === false;
  }

  private showWarning(message: string): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      data: {
        title: 'Aviso',
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
