// src/app/views/analytics/analytics.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

import { AnalyticsService } from '@app/services/analytics.service';

Chart.register(ChartDataLabels);

interface Register {
  id: number;
  deletedAt: any;
  is_history: string;
  date_attention: string;
  state?: { name: string };
  program?: { name: string }; // 👈 AGREGAR ESTO
  registerSubstances?: any[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    BaseChartDirective,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
  ],
})
export class AnalyticsComponent implements OnInit {
  registers: Register[] = [];
  filteredRegisters: Register[] = [];

  readonly ALL = 'ALL';

  auditGeneral: any = null;
  auditMonthly: any[] = [];
  auditProgram: any[] = [];

  showGeneralAudit = false;
  showMonthlyAudit = false;
  showProgramAudit = false;

  kpiTitle = 'Demandas';
  kpiValue = 0;

  filtersForm!: FormGroup;

  averageWaitingDays = 0;
  activeCount = 0;

  years = [2025, 2026];

  months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  // ⚠ Ajusta estos IDs a los reales de tu backend
  states = [
    { value: 1, label: 'Aceptado' },
    { value: 2, label: 'En Trámite' },
    { value: 3, label: 'No Aceptado' },
  ];

  totalDays = 0;
  totalCases = 0;
  calculatedIds: number[] = [];
  constructor(
    private analyticsService: AnalyticsService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.filtersForm = this.fb.group({
      year: [this.ALL],
      month: [this.ALL],
      state: [this.ALL],
    });

    this.analyticsService.getAllRegistersWithSubstances().subscribe((data) => {
      // 🔥 ELIMINAR DUPLICADOS POR ID
      const unique = Array.from(
        new Map(data.map((r: any) => [r.id, r])).values(),
      );

      this.registers = unique.filter(
        (r: any) => r.deletedAt === null && r.is_history === 'NO',
      );

      this.filteredRegisters = [...this.registers];

      this.rebuildDashboard();
    });

    this.filtersForm.valueChanges.subscribe((filters) => {
      this.applyFilters(filters);
    });
  }

  applyFilters(filters: any) {
    this.filteredRegisters = this.registers.filter((r: Register) => {
      if (r.deletedAt !== null) return false;
      if (r.is_history !== 'NO') return false;

      if (filters.year !== this.ALL) {
        const year = new Date(r.date_attention).getFullYear();
        if (year !== filters.year) return false;
      }

      if (filters.month !== this.ALL) {
        const month = new Date(r.date_attention).getMonth() + 1;
        if (month !== filters.month) return false;
      }

      if (filters.state !== this.ALL) {
        const selectedLabel = this.states.find(
          (s) => s.value === filters.state,
        )?.label;

        if (this.normalize(r.state?.name) !== this.normalize(selectedLabel)) {
          return false;
        }
      }

      return true;
    });

    this.rebuildDashboard();
  }

  rebuildDashboard(): void {
    // ===============================
    // DATASET BASE SEGÚN FILTRO
    // ===============================
    const base = [...this.filteredRegisters];

    // ===============================
    // KPI PRINCIPAL
    // ===============================
    this.kpiValue = base.length;
    this.activeCount = base.length;

    const selectedState = this.filtersForm.value.state;

    if (selectedState !== this.ALL) {
      const stateLabel = this.states.find(
        (s) => s.value === selectedState,
      )?.label;

      this.kpiTitle = `Demandas ${stateLabel}`;
    } else {
      this.kpiTitle = 'Demandas';
    }

    // ===============================
    // PROMEDIO SEGÚN FILTRO ACTUAL
    // ===============================

    const days: number[] = base.map((r: Register) => {
      if (!r.date_attention) return 0;

      const start = new Date(r.date_attention);
      const today = new Date();

      return Math.floor((today.getTime() - start.getTime()) / 86400000);
    });

    // 🔹 Calcular totales UNA SOLA VEZ
    this.totalDays = days.reduce((a: number, b: number) => a + b, 0);
    this.totalCases = base.length;
    this.calculatedIds = base.map((r) => r.id);

    // 🔹 Promedio final
    this.averageWaitingDays = this.totalCases
      ? Math.round(this.totalDays / this.totalCases)
      : 0;

    // 🔎 Auditoría General
    this.auditGeneral = {
      totalDays: this.totalDays,
      totalCases: this.totalCases,
      average: this.averageWaitingDays,
      ids: this.calculatedIds,
    };

    // ===============================
    // RECONSTRUIR GRÁFICOS
    // ===============================
    this.buildMonthlyTrend();
    this.buildProgramComparison();
    this.buildPrincipalSubstances();
    this.buildSecondarySubstances();
  }

  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  buildMonthlyTrend() {
    const grouped: { [key: string]: Register[] } = {};
    this.auditMonthly = [];

    this.filteredRegisters.forEach((r: Register) => {
      const date = new Date(r.date_attention);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const labels: string[] = [];
    const values: number[] = [];

    Object.keys(grouped)
      .sort()
      .forEach((month) => {
        const records: Register[] = grouped[month];

        const days: number[] = records.map((r: Register) => {
          const start = new Date(r.date_attention);
          const today = new Date();
          return Math.floor((today.getTime() - start.getTime()) / 86400000);
        });

        const totalDays = days.reduce((a: number, b: number) => a + b, 0);
        const totalCases = records.length;
        const avg = totalCases ? Math.round(totalDays / totalCases) : 0;

        labels.push(month);
        values.push(avg);

        this.auditMonthly.push({
          month,
          totalDays,
          totalCases,
          average: avg,
          ids: records.map((r: Register) => r.id),
        });
      });

    this.lineChartData = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Promedio Espera Mensual',
          borderWidth: 2,
          tension: 0.3,
          fill: false,

          // 🔵 Configuración específica para línea
          datalabels: {
            color: '#2e7d32', // Verde institucional
            align: 'top',
            anchor: 'end',
            font: {
              weight: 600,
              size: 11,
            },
          },
        },
      ],
    };
  }

  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };

  buildProgramComparison() {
    const grouped: { [key: string]: Register[] } = {};
    this.auditProgram = [];

    this.filteredRegisters.forEach((r: Register) => {
      const program = r.program?.name || 'Sin Programa';

      if (!grouped[program]) grouped[program] = [];
      grouped[program].push(r);
    });

    const labels: string[] = [];
    const values: number[] = [];

    Object.keys(grouped).forEach((program) => {
      const records: Register[] = grouped[program];

      const days: number[] = records.map((r: Register) => {
        const start = new Date(r.date_attention);
        const today = new Date();
        return Math.floor((today.getTime() - start.getTime()) / 86400000);
      });

      const totalDays = days.reduce((a: number, b: number) => a + b, 0);
      const totalCases = records.length;
      const avg = totalCases ? Math.round(totalDays / totalCases) : 0;

      labels.push(program);
      values.push(avg);

      // 🔎 Auditoría por programa
      this.auditProgram.push({
        program,
        totalDays,
        totalCases,
        average: avg,
        ids: records.map((r: Register) => r.id),
      });
    });

    this.barChartData = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Promedio por Programa',
        },
      ],
    };
  }

  principalChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };

  buildPrincipalSubstances() {
    const grouped: { [key: string]: number } = {};

    this.filteredRegisters.forEach((r) => {
      r.registerSubstances?.forEach((rs: any) => {
        if (rs.level === 'Principal') {
          const name = rs.substance?.name || 'Sin registro';
          if (!grouped[name]) grouped[name] = 0;
          grouped[name]++;
        }
      });
    });

    this.principalChartData = {
      labels: Object.keys(grouped),
      datasets: [
        {
          data: Object.values(grouped) as number[],
          label: 'Sustancias Principales',
        },
      ],
    };
  }

  secondaryChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };

  buildSecondarySubstances() {
    const grouped: { [key: string]: number } = {};

    this.filteredRegisters.forEach((r) => {
      r.registerSubstances?.forEach((rs: any) => {
        if (rs.level === 'Secundaria') {
          const name = rs.substance?.name || 'Sin registro';
          if (!grouped[name]) grouped[name] = 0;
          grouped[name]++;
        }
      });
    });

    this.secondaryChartData = {
      labels: Object.keys(grouped),
      datasets: [
        {
          data: Object.values(grouped) as number[],
          label: 'Sustancias Secundarias',
        },
      ],
    };
  }

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          font: {
            size: 13,
            weight: 500,
          },
        },
      },
      datalabels: {
        anchor: 'center',
        align: 'center',
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 12,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y: {
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  resetFilters(): void {
    this.filtersForm.patchValue(
      {
        year: this.ALL,
        month: this.ALL,
        state: this.ALL,
      },
      { emitEvent: false },
    );

    // Restaurar dataset completo
    this.filteredRegisters = [...this.registers];

    this.rebuildDashboard();
  }

  private normalize(value: string | undefined | null): string {
    if (!value) return '';

    return value
      .normalize('NFD') // separa acentos
      .replace(/[\u0300-\u036f]/g, '') // elimina acentos
      .trim()
      .toUpperCase();
  }
}
