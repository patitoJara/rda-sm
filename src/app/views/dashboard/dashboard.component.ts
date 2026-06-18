// src/app/dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardService } from './dashboard.service';
import {
  DashboardDemand,
  DashboardStats,
} from './models/dashboard-stats.model';

import { DashboardFiltersComponent } from './dashboard-filters.component';
import { DashboardCardsComponent } from './dashboard-cards.component';
import { DashboardChartsComponent } from './dashboard-charts.component';
import { DashboardCriticalTableComponent } from './dashboard-critical-table.component';
import { DashboardTableComponent } from './dashboard-table.component';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    CommonModule,
    DashboardFiltersComponent,
    DashboardCardsComponent,
    DashboardChartsComponent,
    DashboardCriticalTableComponent,
    DashboardTableComponent,
  ],
})
export class DashboardComponent implements OnInit {
  demandasRaw: any[] = [];

  datasetBase: DashboardDemand[] = [];

  dataset: DashboardDemand[] = [];

  stats!: DashboardStats;

  criticos: DashboardDemand[] = [];

  filtros: any = {};

  loading = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;

    this.dashboardService.getDemandas().subscribe({
      next: (data) => {
        this.demandasRaw = data;

        this.datasetBase = this.dashboardService.buildDataset(data);

        const filtrosActivos = this.filtros?.periodo
          ? this.filtros
          : {
              periodo: 'mes_actual',
              indicador: 'solicitud_hoy',
              estadoPrograma: 'todos',
              grupoEtario: 'todos',
              rut: '',
            };

        const filtradas = this.dashboardService.filterDataset(
          this.datasetBase,
          filtrosActivos,
        );

        this.stats = this.dashboardService.calculateStats(filtradas);

        this.criticos = this.dashboardService.getCriticos(filtradas);

        this.dataset = filtradas;

        this.loading = false;
      },

      error: (err) => {
        console.error('Error cargando dashboard', err);

        this.loading = false;
      },
    });
  }

  onFiltersChange(filtros: any): void {
    this.filtros = filtros;

    const filtradas = this.dashboardService.filterDataset(
      this.datasetBase,
      filtros,
    );

    this.stats = this.dashboardService.calculateStats(filtradas);

    this.criticos = this.dashboardService.getCriticos(filtradas);

    this.dataset = filtradas;
  }
}
