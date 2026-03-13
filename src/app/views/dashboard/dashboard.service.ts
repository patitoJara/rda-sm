// src/app/dashboard/dashboard.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  DashboardDemand,
  DashboardStats,
} from './models/dashboard-stats.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  getDemandas(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/registers`);
  }

  buildDataset(demandas: any[]): DashboardDemand[] {
    const today = new Date();

    return demandas.map((d) => {
      // 🛡️ PROTEGER FECHA
      let requestDate: Date | null = null;

      if (d.requestDate) {
        const parsed = new Date(d.requestDate);

        if (!isNaN(parsed.getTime())) {
          requestDate = parsed;
        }
      }

      const citas = d.appointments || [];

      const asistio = citas.filter((c: any) => c.attended === true).length;
      const noAsistio = citas.filter((c: any) => c.attended === false).length;

      const dias = requestDate
        ? Math.floor(
            (today.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        rut: d.postulant?.rut || '',

        usuario:
          `${d.postulant?.firstName ?? ''} ${d.postulant?.firstLastName ?? ''}`.trim(),

        programa: d.program?.name || 'Sin programa',

        requestDate: requestDate,

        citacionesTotal: citas.length,
        citacionesAsistio: asistio,
        citacionesNoAsistio: noAsistio,

        diasEspera: dias,
      };
    });
  }

  filterDataset(data: DashboardDemand[], filtros: any): DashboardDemand[] {
    let result = [...data];

    if (filtros?.rut) {
      result = result.filter((d) => d.rut.includes(filtros.rut));
    }

    if (filtros?.programa) {
      result = result.filter((d) => d.programa === filtros.programa);
    }

    return result;
  }

  calculateStats(data: DashboardDemand[]): DashboardStats {
    const totalDemandas = data.length;

    const dias = data.map((d) => d.diasEspera);

    const promedioEspera = dias.length
      ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length)
      : 0;

    const sorted = [...dias].sort((a, b) => a - b);

    const mid = Math.floor(sorted.length / 2);

    const medianaEspera = sorted.length
      ? sorted.length % 2
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : 0;

    const maxEspera = dias.length ? Math.max(...dias) : 0;

    const criticos = data.filter((d) => d.diasEspera > 30).length;

    const citacionesTotal = data.reduce((sum, d) => sum + d.citacionesTotal, 0);

    const citacionesAsistio = data.reduce(
      (sum, d) => sum + d.citacionesAsistio,
      0,
    );

    const citacionesNoAsistio = data.reduce(
      (sum, d) => sum + d.citacionesNoAsistio,
      0,
    );

    return {
      totalDemandas,
      demandasAtendidas: 0,
      demandasEnEspera: totalDemandas,

      promedioEspera,
      medianaEspera,
      maxEspera,

      criticos,

      citacionesTotal,
      citacionesAsistio,
      citacionesNoAsistio,
    };
  }

  getCriticos(data: DashboardDemand[]): DashboardDemand[] {
    return data
      .filter((d) => d.diasEspera > 30)
      .sort((a, b) => b.diasEspera - a.diasEspera)
      .slice(0, 10);
  }
}
