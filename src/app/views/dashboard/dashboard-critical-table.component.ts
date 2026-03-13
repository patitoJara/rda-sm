// src/app/dashboard/dashboard-critical-table.component.ts

import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { DashboardDemand } from './models/dashboard-stats.model'

@Component({
  standalone: true,
  selector: 'app-dashboard-critical-table',
  templateUrl: './dashboard-critical-table.component.html',
  styleUrls: ['./dashboard-critical-table.component.scss'],
  imports: [
    CommonModule
  ]
})
export class DashboardCriticalTableComponent {

  @Input() data: DashboardDemand[] = []

  getColor(days: number): string {

    if (days <= 15) return 'green'
    if (days <= 30) return 'orange'

    return 'red'

  }

  viewDetail(row: DashboardDemand): void {

    console.log('Ver detalle demandante', row)

  }

}