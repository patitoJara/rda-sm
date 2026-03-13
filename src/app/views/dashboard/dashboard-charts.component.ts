// src/app/views/dashboard/dashboard-charts.component.ts

import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDemand } from './models/dashboard-stats.model';

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

@Component({
  standalone: true,
  selector: 'app-dashboard-charts',
  templateUrl: './dashboard-charts.component.html',
  styleUrls: ['./dashboard-charts.component.scss'],
  imports: [CommonModule],
})
export class DashboardChartsComponent implements OnChanges {
  @Input() dataset: DashboardDemand[] = [];

  ngOnChanges(): void {
    if (!this.dataset || !this.dataset.length) return;

    this.buildDemandTrend();
    this.buildProgramChart();
  }

  buildDemandTrend(): void {
    const months: any = {};

    this.dataset.forEach;
    const labels = Object.keys(months);
    const values = Object.values(months);

    new Chart('trendChart', {
      type: 'line',

      data: {
        labels,
        datasets: [
          {
            label: 'Demandas por mes',
            data: values,
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      },
    });
  }

  buildProgramChart(): void {
    const programs: any = {};

    this.dataset.forEach((d) => {
      if (!d.programa) return;

      programs[d.programa] = (programs[d.programa] || 0) + 1;
    });

    const labels = Object.keys(programs);
    const values = Object.values(programs);

    new Chart('programChart', {
      type: 'bar',

      data: {
        labels,
        datasets: [
          {
            label: 'Demandas por programa',
            data: values,
          },
        ],
      },
    });
  }
}
