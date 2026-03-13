export interface DashboardDemand {

  rut: string
  usuario: string
  programa: string

  requestDate: Date | null

  citacionesTotal: number
  citacionesAsistio: number
  citacionesNoAsistio: number

  diasEspera: number

}

export interface DashboardStats {

  totalDemandas: number
  demandasAtendidas: number
  demandasEnEspera: number

  promedioEspera: number
  medianaEspera: number
  maxEspera: number

  criticos: number

  citacionesTotal: number
  citacionesAsistio: number
  citacionesNoAsistio: number

}