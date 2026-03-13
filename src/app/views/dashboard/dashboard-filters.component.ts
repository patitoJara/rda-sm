// src/app/dashboard/dashboard-filters.component.ts

import { Component, EventEmitter, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

@Component({
  standalone: true,
  selector: 'app-dashboard-filters',
  templateUrl: './dashboard-filters.component.html',
  styleUrls: ['./dashboard-filters.component.scss'],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class DashboardFiltersComponent {

  @Output() filtersChange = new EventEmitter<any>()

  filtros = {
    periodo: '6m',
    indicador: 'solicitud_hoy',
    estadoPrograma: 'todos',
    grupoEtario: 'todos',
    rut: ''
  }

  applyFilters(): void {

    this.filtersChange.emit({ ...this.filtros })

  }

  clearFilters(): void {

    this.filtros = {
      periodo: '6m',
      indicador: 'solicitud_hoy',
      estadoPrograma: 'todos',
      grupoEtario: 'todos',
      rut: ''
    }

    this.applyFilters()

  }

}