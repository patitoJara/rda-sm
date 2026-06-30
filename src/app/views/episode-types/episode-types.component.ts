// ============================================================
// ✅ EPISODE TYPES COMPONENT
// Mantenedor de tipos de episodio
// ============================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '../../services/catalog-maintainer.service';

import { EpisodeTypesDialogComponent } from './episode-types.dialog';

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
  ],
  templateUrl: './episode-types.component.html',
  styleUrls: ['./episode-types.component.scss'],
})
export class EpisodeTypesComponent implements OnInit {
  private catalogService = inject(CatalogMaintainerService);
  private dialog = inject(MatDialog);

  readonly resource = 'episode_types';

  items: CatalogItem[] = [];
  loading = false;
  showDeleted = false;

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.loading = true;

    try {
      this.items = await firstValueFrom(
        this.catalogService.getDemandCatalog('episodeTypes'),
      );
    } catch (error) {
      console.error('[EpisodeTypes] Error cargando registros:', error);
      this.items = [];
    } finally {
      this.loading = false;
    }
  }

  toggleDeleted(): void {
    this.showDeleted = !this.showDeleted;
    this.loadItems();
  }

  openDialog(item?: CatalogItem): void {
    const ref = this.dialog.open(EpisodeTypesDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: ['maintainer-dialog'],
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
    if (!item.id) return;

    const ok = confirm(`¿Eliminar el tipo de episodio "${item.name}"?`);

    if (!ok) return;

    try {
      await firstValueFrom(this.catalogService.delete(this.resource, item.id));
      await this.loadItems();
    } catch (error) {
      console.error('[EpisodeTypes] Error eliminando:', error);
      alert('No fue posible eliminar el registro.');
    }
  }

  async restoreItem(item: CatalogItem): Promise<void> {
    if (!item.id) return;

    try {
      await firstValueFrom(this.catalogService.restore(this.resource, item.id));
      await this.loadItems();
    } catch (error) {
      console.error('[EpisodeTypes] Error restaurando:', error);
      alert('No fue posible restaurar el registro.');
    }
  }

  isDeleted(item: CatalogItem): boolean {
    return !!item.deletedAt;
  }
}
