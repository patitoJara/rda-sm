import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  takeUntil,
} from 'rxjs';

import {
  CatalogItem,
  CatalogMaintainerService,
} from '@app/services/catalog-maintainer.service';
import { ConfirmDialogYesNoComponent } from '@app/shared/confirm-dialog/confirm-dialog-yes-no.component';
import { ConfirmDialogOkComponent } from '@app/shared/confirm-dialog/confirm-dialog-ok.component';
import {
  CitiesDialogComponent,
  CitiesDialogData,
  CityItem,
  RegionItem,
} from './cities.dialog';

interface CityRow extends CatalogItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  regionId: number | null;
  regionCode: string | null;
  regionName: string | null;
}

@Component({
  selector: 'app-cities',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './cities.component.html',
  styleUrls: ['./cities.component.scss'],
})
export class CitiesComponent implements AfterViewInit, OnDestroy {
  private readonly resource = 'cities';
  private readonly regionResource = 'regions';
  private readonly destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'id',
    'code',
    'name',
    'region',
    'description',
    'active',
    'recordStatus',
    'actions',
  ];

  dataSource = new MatTableDataSource<CityRow>([]);
  private loadedRows: CityRow[] = [];

  searchControl = new FormControl('', { nonNullable: true });
  regionFilterControl = new FormControl<number | null>(null);

  loading = false;
  loadError = '';
  total = 0;
  showDeleted = false;

  regions: RegionItem[] = [];
  loadingRegions = false;
  regionsError = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private readonly catalogService: CatalogMaintainerService,
    private readonly dialog: MatDialog,
  ) {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.paginator?.firstPage();
        this.loadCities();
      });

    this.regionFilterControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.paginator?.firstPage();
        this.applyRegionFilter();
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (row, column) => {
      switch (column) {
        case 'region':
          return row.regionName ?? '';
        case 'recordStatus':
          return row.deletedAt ? 'eliminado' : 'activo';
        default:
          return String(row[column as keyof CityRow] ?? '');
      }
    };

    this.loadRegions();
    this.loadCities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCities(): void {
    this.loading = true;
    this.loadError = '';

    this.catalogService
      .getAll(this.resource, {
        q: this.searchControl.value.trim() || undefined,
        includeDeleted: true,
        deleted: this.showDeleted ? true : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const rows = (Array.isArray(response) ? response : []) as CityRow[];

          this.loadedRows = this.showDeleted
            ? rows.filter((row) => !!row.deletedAt)
            : rows.filter((row) => !row.deletedAt);

          this.applyRegionFilter();
        },
        error: (error) => {
          console.error('[Cities] Error cargando comunas:', error);
          this.loadedRows = [];
          this.dataSource.data = [];
          this.total = 0;
          this.loadError = 'No fue posible cargar las comunas por región.';
        },
      });
  }


  loadRegions(): void {
    this.loadingRegions = true;
    this.regionsError = '';

    this.catalogService
      .getAll(this.regionResource, { active: true })
      .pipe(finalize(() => (this.loadingRegions = false)))
      .subscribe({
        next: (response) => {
          this.regions = ((response ?? []) as RegionItem[])
            .filter((region) => region.active && !region.deletedAt)
            .sort((a, b) =>
              a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
            );
        },
        error: (error) => {
          console.error('[Cities] Error cargando regiones:', error);
          this.regions = [];
          this.regionsError = 'No fue posible cargar las regiones.';
        },
      });
  }

  clearRegionFilter(): void {
    this.regionFilterControl.setValue(null);
  }

  private applyRegionFilter(): void {
    const regionId = this.regionFilterControl.value;

    this.dataSource.data = regionId === null
      ? [...this.loadedRows]
      : this.loadedRows.filter((row) => row.regionId === regionId);

    this.total = this.dataSource.data.length;
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  toggleDeleted(): void {
    this.showDeleted = !this.showDeleted;
    this.paginator.firstPage();
    this.loadCities();
  }

  openCreate(): void {
    this.openDialog({ mode: 'create' });
  }

  openEdit(row: CityRow): void {
    this.openDialog({ mode: 'edit', item: row as CityItem });
  }

  confirmDelete(row: CityRow): void {
    const ref = this.dialog.open(ConfirmDialogYesNoComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Eliminar comuna',
        message: `¿Seguro que deseas eliminar “${row.name}”?`,
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

      this.catalogService.delete(this.resource, row.id).subscribe({
        next: () => {
          this.openMessage(
            'Comuna eliminada',
            `La comuna “${row.name}” fue eliminada correctamente.`,
            'delete',
          );
          this.loadCities();
        },
        error: (error) => {
          console.error('[Cities] Error eliminando comuna:', error);
          this.openMessage(
            'No fue posible eliminar',
            'Ocurrió un problema al eliminar la comuna.',
            'error',
          );
        },
      });
    });
  }

  confirmRestore(row: CityRow): void {
    const ref = this.dialog.open(ConfirmDialogYesNoComponent, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'rda-confirm-dialog',
      backdropClass: 'app-backdrop',
      data: {
        title: 'Restaurar comuna',
        message: `¿Deseas restaurar la comuna “${row.name}”?`,
        confirmText: 'Restaurar',
        cancelText: 'Cancelar',
        color: 'primary',
        icon: 'settings_backup_restore',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.catalogService.restore(this.resource, row.id).subscribe({
        next: () => {
          this.openMessage(
            'Comuna restaurada',
            `La comuna “${row.name}” fue restaurada correctamente.`,
            'settings_backup_restore',
          );
          this.loadCities();
        },
        error: (error) => {
          console.error('[Cities] Error restaurando comuna:', error);
          this.openMessage(
            'No fue posible restaurar',
            'Ocurrió un problema al restaurar la comuna.',
            'error',
          );
        },
      });
    });
  }

  private openDialog(data: CitiesDialogData): void {
    const dialogRef = this.dialog.open<
      CitiesDialogComponent,
      CitiesDialogData,
      boolean
    >(CitiesDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      disableClose: true,
      panelClass: 'catalog-dialog-panel',
      backdropClass: 'app-backdrop',
      data,
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadCities();
      }
    });
  }

  private openMessage(
    title: string,
    message: string,
    icon: string,
  ): void {
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
        icon,
      },
    });
  }
}
