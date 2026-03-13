// src/app/dashboard/dashboard-cards.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStats } from './models/dashboard-stats.model';

@Component({
  standalone: true,
  selector: 'app-dashboard-cards',
  templateUrl: './dashboard-cards.component.html',
  styleUrls: ['./dashboard-cards.component.scss'],
  imports: [CommonModule],
})
export class DashboardCardsComponent {
  @Input() stats!: DashboardStats;

  getColor(dias: number): string {
    if (dias > 30) return '#d32f2f'; // rojo

    if (dias > 15) return '#f9a825'; // amarillo

    return '#2e7d32'; // verde
  }
}
