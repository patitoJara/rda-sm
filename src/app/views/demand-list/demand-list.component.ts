// ===================================================================
// DEMAND LIST COMPONENT — COMPLETO, ORDENADO Y COMPILABLE
// ===================================================================
import { Component, OnInit, ViewChild, inject } from '@angular/core';

import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';

import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';

// 🔹 Adaptador de fecha chileno
import {
  ChileDateAdapter,
  FORMATO_FECHA_CHILE,
} from '@app/core/chile-date-adapter';

// 🔹 Angular Material
import {
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
  MatNativeDateModule,
  DateAdapter,
} from '@angular/material/core';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// 🔹 RXJS
import { forkJoin, merge, finalize } from 'rxjs';
import { map } from 'rxjs/operators';

// 🔹 Servicios
import { CatalogMaintainerService } from '../../services/catalog-maintainer.service';
import { SexService } from '../../services/sex.service';
import { ContactTypeService } from '../../services/contact.type.service';
import { ProgramService } from '../../services/program.service';
import { SubstanceService } from '../../services/substance.service';
import { ResultService } from '../../services/result.service';
import { StateService } from '@app/services/state.service';
import { ConvPrevService } from '../../services/conv-prev.service';
import { IntPrevService } from '../../services/int-prev.service';
import { TokenService } from '../../services/token.service';
import { PostulantService } from '../../services/postulant.service';
import { ContactService } from '../../services/contact.service';
import { RegisterMovementService } from '../../services/register-movement.service';
import { RegisterSubstanceService } from '../../services/register-substance.service';
import { DiverterService } from '../../services/diverter.service';
import { SenderService } from '../../services/sender.service';
import { ProfessionService } from '../../services/profession.service';
import { NotRelevantService } from '../../services/not-relevant.service';
import { RegisterService } from '../../services/register.service';

import { DemandDetailViewService } from '@app/services/reports/demand-detail-view.service';
import { RegisterFullLoaderService } from '@app/services/register-full-loader.service';
import { LoaderService } from '../../services/loader.service';
import { firstValueFrom } from 'rxjs';

registerLocaleData(localeEsCL);

// ===================================================================
// INTERFACE FILAS DE TABLA
// ===================================================================
interface Demandante {
  id: number;
  programa: string;
  usuario: string;
  dias: number;
  postulante: string;
  rut: string;
  comuna: string;
  fecha: Date;
  tipoContacto: string;
  estado: string;
  sustancia: string;
  //sexo: string;
}

// ===================================================================
// COMPONENTE
// ===================================================================
@Component({
  selector: 'app-demand-list',
  standalone: true,
  templateUrl: './demand-list.component.html',
  styleUrls: ['./demand-list.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSortModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: MAT_DATE_FORMATS, useValue: FORMATO_FECHA_CHILE },
    { provide: DateAdapter, useClass: ChileDateAdapter },
  ],
})
export class DemandListComponent implements OnInit {
  private loader = inject(LoaderService);

  constructor(
    private fb: FormBuilder,
    private catalogMaintainerService: CatalogMaintainerService,
    private sexService: SexService,
    private contactTypeService: ContactTypeService,
    private programService: ProgramService,
    private substanceService: SubstanceService,
    private stateService: StateService,
    private ResultService: ResultService,
    private convPrevService: ConvPrevService,
    private intPrevService: IntPrevService,
    private tokenService: TokenService,
    private postulantService: PostulantService,
    private contactService: ContactService,
    private registerMovementService: RegisterMovementService,
    private registerSubstanceService: RegisterSubstanceService,
    private senderService: SenderService,
    private diverterService: DiverterService,
    private notRelevantService: NotRelevantService,
    private professionService: ProfessionService,
    private demandDetailViewService: DemandDetailViewService,
    private registerFullLoader: RegisterFullLoaderService,
    private registerService: RegisterService,
  ) {}

  // =============================================================
  // UTILITY: normaliza array pageable o normal
  // =============================================================
  private toArray(resp: any): any[] {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (resp?.content && Array.isArray(resp.content)) return resp.content;
    return [];
  }

  displayedColumns = [
    'id',
    'postulante',
    'rut',
    'programa',
    'comuna',
    'dias',
    'fecha',
    'estado',
    'sustancia',
    'tipoContacto',
    'acciones',
  ];

  dataSource = new MatTableDataSource<Demandante>([]);
  private datasetBase: Demandante[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  formFiltros!: FormGroup;

  programsCatalog: any[] = [];
  sexesCatalog: any[] = [];
  communesCatalog: any[] = [];
  substancesCatalog: any[] = [];
  contactTypesCatalog: any[] = [];
  statesCatalog: any[] = [];

  programs: any[] = [];
  sexes: any[] = [];
  communes: any[] = [];
  substances: any[] = [];
  contactTypes: any[] = [];
  states: any[] = [];

  isLoading = false;

  // ===================================================================
  // INIT
  // ===================================================================

  async ngOnInit(): Promise<void> {
    this.loader.lock();

    try {
      await this.cargarFormulario();
      await this.loadCatalogs();
      await this.cargarDatosTablaReal();
    } catch (error) {
      console.error(error);
    } finally {
      this.loader.unlock();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.paginator.pageSize = 9;
  }

  // =============================================================
  cargarFormulario() {
    this.formFiltros = this.fb.group({
      programa: [null],
      comuna: [null],
      tcontacto: [null],
      sustancia: [null],
      estado: [null],
      fechaInicio: [null],
      fechaFin: [null],
      nombre: [''],
    });
  }

  // =============================================================
  //   🚀 CARGA DATOS CON SUSTANCIA PRINCIPAL
  // =============================================================
  async cargarDatosTablaReal(): Promise<void> {
    const rows: any[] = await firstValueFrom(this.registerService.getAll());

    const requests = rows.map((reg) =>
      this.registerSubstanceService.searchByRegisterId(reg.id).pipe(
        map((resp: any) => {
          const pageable = Array.isArray(resp) ? { content: resp } : resp;
          const subs = pageable?.content ?? [];
          const principal = subs.find((x: any) => x.level === 'Principal');

          return {
            reg,
            principal: principal?.substance?.name ?? '---',
          };
        }),
      ),
    );

    const results = await firstValueFrom(forkJoin(requests));

    const tabla: Demandante[] = results.map((item) => {
      const r = item.reg;

      return {
        id: r.id,
        postulante:
          `${r.postulant?.firstName ?? ''} ${r.postulant?.lastName ?? ''}`.trim(),
        rut: r.postulant?.rut ?? '---',
        programa: r.program?.name ?? '---',
        comuna: r.postulant?.commune?.name ?? '---',
        dias: r.date_attention
          ? this.getDiasTranscurridos(r.date_attention)
          : 0,
        fecha: r.date_attention ? new Date(r.date_attention) : new Date(),
        estado: r.state?.name ?? '---',
        usuario: r.user?.username ?? '---',
        sustancia: item.principal,
        tipoContacto: r.contactType?.name ?? '---',
      };
    });

    this.datasetBase = tabla;
    this.actualizarFiltrosPorTabla();
    this.aplicarFiltros();
  }

  // =============================================================
  // CATÁLOGOS
  // =============================================================
  async loadCatalogs(): Promise<void> {
    const data = await firstValueFrom(
      forkJoin({
        programs: this.programService.listAll(),
        communes: this.catalogMaintainerService.getAll('cities', {
          active: true,
          includeDeleted: false,
        }),
        contactTypes: this.contactTypeService.listAll(),
        substances: this.substanceService.listAll(),
        states: this.stateService.listAll(),
      }),
    );
    this.programsCatalog = data.programs;
    this.communesCatalog = data.communes;
    this.contactTypesCatalog = data.contactTypes;
    this.substancesCatalog = data.substances;
    this.statesCatalog = data.states;
  }

  // =============================================================
  // FILTROS (FRONT)
  // =============================================================
  actualizarFiltrosPorTabla(): void {
    const data = this.datasetBase;

    this.programs = this.unique(data.map((d) => d.programa)).map((name) => ({
      name,
    }));

    this.communes = this.unique(data.map((d) => d.comuna)).map((name) => ({
      name,
    }));

    this.contactTypes = this.unique(data.map((d) => d.tipoContacto)).map(
      (name) => ({ name }),
    );

    this.substances = Array.from(
      new Set(data.map((d) => d.sustancia).filter((s) => s && s !== '---')),
    ).sort();

    this.states = this.unique(data.map((d) => d.estado)).map((name) => ({
      name,
    }));
  }

  // =============================================================
  // FUNCION PARA ELIMINAR DUPLICADOS
  // =============================================================
  private unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }

  // =============================================================
  // APLICAR FILTROS EN FONTEND
  // =============================================================
  aplicarFiltros(): void {
    const f = this.formFiltros.value;

    const hayFiltros =
      !!f.programa ||
      !!f.comuna ||
      !!f.tcontacto ||
      !!f.sustancia ||
      !!f.estado ||
      !!(f.nombre && f.nombre.trim()) ||
      !!f.fechaInicio ||
      !!f.fechaFin;

    const filtrados = !hayFiltros
      ? this.datasetBase
      : this.datasetBase.filter((item) => {
          const norm = (s: string) => this.normalizar(s ?? '');

          const nombreOK = f.nombre
            ? norm(item.postulante).includes(norm(f.nombre))
            : true;

          const programaOK = f.programa
            ? norm(item.programa) === norm(f.programa)
            : true;

          const sustanciaOK = f.sustancia
            ? norm(item.sustancia) === norm(f.sustancia)
            : true;

          const tcontactOK = f.tcontacto
            ? norm(item.tipoContacto) === norm(f.tcontacto)
            : true;

          const comunaOK = f.comuna
            ? norm(item.comuna) === norm(f.comuna)
            : true;

          const estadoOK = f.estado
            ? norm(item.estado) === norm(f.estado)
            : true;

          // 📅 fechas sin hora
          const soloFecha = (v: any): number => {
            const d = new Date(v);
            return new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate(),
            ).getTime();
          };

          const fechaItem = item.fecha ? soloFecha(item.fecha) : null;
          const desde = f.fechaInicio ? soloFecha(f.fechaInicio) : null;
          const hasta = f.fechaFin ? soloFecha(f.fechaFin) : null;

          const fechaOK =
            (!desde || (fechaItem !== null && fechaItem >= desde)) &&
            (!hasta || (fechaItem !== null && fechaItem <= hasta));

          return (
            nombreOK &&
            programaOK &&
            sustanciaOK &&
            tcontactOK &&
            comunaOK &&
            estadoOK &&
            fechaOK
          );
        });

    this.dataSource.data = filtrados;

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  limpiarFiltros(): void {
    this.formFiltros.reset();

    this.dataSource.data = this.datasetBase;

    if (this.paginator) {
      this.dataSource.paginator = this.paginator; // 👈 CLAVE
      this.paginator.firstPage();
    }
  }

  // =============================================================
  //  UTILIDADES
  // =============================================================
  normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  formatearTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .split(' ')
      .filter((p) => p.trim().length)
      .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
      .join(' ');
  }

  parsearFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

    if (typeof fecha === 'string' && fecha.includes('T')) {
      const d = new Date(fecha);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
      const [d, m, y] = fecha.split('/');
      return new Date(+y, +m - 1, +d);
    }

    return null;
  }

  getDiasTranscurridos(fecha: Date | string): number {
    // Convertir ambas fechas a medianoche (00:00)
    const f = new Date(fecha);
    const hoy = new Date();

    const fechaSinHora = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    const hoySinHora = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
    );

    const diffMs = hoySinHora.getTime() - fechaSinHora.getTime();

    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return dias;
  }

  private toArrayForce(value: any): any[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
  //******************************************************************************************
  //  VER DETALLE DEMANDA
  //******************************************************************************************

  verDetalle(regResumen: any): void {
    if (!regResumen || !regResumen.id) {
      alert('❌ Registro no válido.');
      return;
    }

    this.registerFullLoader.load(regResumen.id).subscribe((full) => {
      const sustancias = this.toArrayForce(full.sustancias);
      const movimientos = this.toArrayForce(full.movimientos);

      //this.demandDetailViewService.show(full.registro, sustancias, movimientos);
      this.demandDetailViewService.generate(
        full.registro,
        sustancias,
        movimientos,
      );
    });
  }

  //******************************************************************************************
  //  IMPRIMIR DETALLE DEMANDA
  //******************************************************************************************

  imprimirDetalle(regResumen: any): void {
    if (!regResumen?.id) {
      alert('❌ Registro no válido.');
      return;
    }

    this.registerFullLoader.load(regResumen.id).subscribe((full) => {
      const sustancias = this.toArrayForce(full.sustancias);
      const movimientos = this.toArrayForce(full.movimientos);

      // 👉 Imprime directamente
      this.demandDetailViewService.generate(
        full.registro,
        sustancias,
        movimientos,
      );
    });
  }
}
