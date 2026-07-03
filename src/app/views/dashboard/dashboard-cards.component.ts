// src/app/dashboard/dashboard-cards.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardStats } from './models/dashboard-stats.model';

@Component({
  standalone: true,
  selector: 'app-dashboard-cards',
  templateUrl: './dashboard-cards.component.html',
  styleUrls: ['./dashboard-cards.component.scss'],
  imports: [CommonModule, MatIconModule],
})
export class DashboardCardsComponent {
  readonly defaultStats: DashboardStats = {
    totalDemandas: 0,
    demandasAtendidas: 0,
    demandasEnEspera: 0,
    promedioEspera: 0,
    medianaEspera: 0,
    maxEspera: 0,
    criticos: 0,
    citacionesTotal: 0,
    citacionesAsistio: 0,
    citacionesNoAsistio: 0,
  };

  private _stats: DashboardStats = this.defaultStats;

  @Input()
  set stats(value: DashboardStats | null | undefined) {
    this._stats = {
      ...this.defaultStats,
      ...(value ?? {}),
    };
  }

  get stats(): DashboardStats {
    return this._stats;
  }

  getColor(dias: number): string {
    if (dias > 30) return '#d32f2f'; // rojo

    if (dias > 15) return '#f9a825'; // amarillo

    return '#2e7d32'; // verde
  }
}
