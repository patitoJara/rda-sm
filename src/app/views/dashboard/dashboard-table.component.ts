// src/app/dashboard/dashboard-table.component.ts

import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { DashboardDemand } from './models/dashboard-stats.model'

@Component({
  standalone: true,
  selector: 'app-dashboard-table',
  templateUrl: './dashboard-table.component.html',
  styleUrls: ['./dashboard-table.component.scss'],
  imports: [
    CommonModule
  ]
})
export class DashboardTableComponent {

  @Input() data: DashboardDemand[] = []

  getColor(days: number): string {
    if (days <= 45) return 'green'

    if (days <= 90) return 'orange'

    return 'red'
  }

  viewDetail(row: DashboardDemand): void {

    console.log('Ver detalle demandante', row)

  }

}