import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { UiLabCrudComponent } from './ui-lab-crud.component';
import { LabTooltipDirective } from './ui-lab-tooltip.directive';
import { balancedKpiColumns } from './ui-lab-overlay.utils';
import { UiLabPickerComponent } from './ui-lab-picker.component';
import { fieldWidth, LabPlanField, planRows } from './ui-lab-planner.utils';
import { formatRut, normalizeRut, validateRut, formatDate, normalizeDate, validateDate, toApiDate, formatTime, normalizeTime, validateTime } from './ui-lab-input.utils';

@Component({
  selector: 'app-ui-lab',
  standalone: true,
  imports: [FormsModule, A11yModule, UiLabPickerComponent, UiLabCrudComponent, LabTooltipDirective],
  templateUrl: './ui-lab.component.html',
  styleUrl: './ui-lab.component.scss',
})
export class UiLabComponent implements AfterViewInit, OnDestroy {
  constructor(private readonly zone: NgZone) {}
  readonly sectionSizes = [16, 18];
  readonly titleSizes = [22, 24, 26];
  readonly yearWidths = [6, 7, 8, 9];
  readonly heightNotes: Record<number, string> = {34: 'Demasiado comprimido', 36: 'Mejor equilibrio · candidato fuerte', 38: 'Usable, más alto de lo necesario', 40: 'Demasiado espacio operacional'};
  countryFocused = false;
  countryExpanded = false;
  countrySelected = false;
  country = 'CL';
  pickerDate = '05/10/2026';
  pickerTime = '18:40';
  pickerProgram = 'a';
  readonly programOptions = [{value: 'a', label: 'Programa de ejemplo'}, {value: 'b', label: 'Otro programa'}, {value: 'c', label: 'Sin cupos · ejemplo disabled', disabled: true}];
  readonly countryOptions = [{value: 'CL', label: 'Chile'}];
  readonly stampVariants = [{size: 150, opacity: .12}, {size: 190, opacity: .18}, {size: 220, opacity: .24}];
  plannerWidth = 1040;
  plannerGap = 12;
  measuredWidth = 1040;
  readonly fieldWidth = fieldWidth;
  readonly planFields: LabPlanField[] = [
    {label: 'Fecha', content: 106, padding: 20, border: 2, icon: 30, minimum: 158, value: '05/10/2026'},
    {label: 'RUT', content: 123, padding: 20, border: 2, icon: 0, minimum: 145, value: '18.903.594-2'},
    {label: 'Nombre', content: 268, padding: 20, border: 2, icon: 0, minimum: 240, value: 'Elena Ríos · ejemplo'},
    {label: 'Programa', content: 244, padding: 20, border: 2, icon: 24, minimum: 240, value: 'Programa de ejemplo'},
  ];
  @ViewChild('plannerCanvas') plannerCanvas!: ElementRef<HTMLElement>;
  @ViewChild('kpiGrid') kpiGrid!: ElementRef<HTMLElement>;
  kpiColumns = 3;
  private resizeObserver?: ResizeObserver;
  get planner() { return planRows(this.planFields, this.measuredWidth, this.plannerGap); }
  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      this.zone.run(() => {
        for (const entry of entries) {
          if (entry.target === this.plannerCanvas.nativeElement) this.measuredWidth = Math.floor(entry.contentRect.width);
          if (entry.target === this.kpiGrid.nativeElement) this.kpiColumns = balancedKpiColumns(entry.contentRect.width);
        }
      });
    });
    this.resizeObserver.observe(this.plannerCanvas.nativeElement);
    this.resizeObserver.observe(this.kpiGrid.nativeElement);
  }
  ngOnDestroy(): void { this.resizeObserver?.disconnect(); }
  setPlannerWidth(value: number): void { this.plannerWidth = Math.min(1800, Math.max(240, Number(value) || 1040)); }
  setPlannerGap(value: number): void { this.plannerGap = Math.min(32, Math.max(0, Number(value) || 0)); }
  readonly paletteOptions = [{value: 'ocean', label: 'Océano'}, {value: 'plum', label: 'Ciruela'}];
  readonly navOptions = [{value: 'desktop', label: 'Desktop · sidebar'}, {value: 'tablet', label: 'Tablet · rail compacto'}, {value: 'mobile', label: 'Mobile · drawer'}];
  readonly stampOptions = ['CERRADO', 'EGRESADO', 'DERIVADO'].map(value => ({value, label: value}));
  palette = 'ocean';
  readonly heights = [34, 36, 38, 40];
  readonly sections = [
    ['type', 'Tipografía'], ['controls', 'Controles'], ['heights', 'Alturas'],
    ['widths', 'Anchos'], ['data', 'Solo lectura'], ['context', 'Contexto'], ['event', 'Eventos'], ['pickers', 'Desplegables'],
    ['filters', 'Filtros'], ['buttons', 'Botones'], ['composition', 'Composición'],
    ['anatomy', 'Anatomía'], ['entry', 'Entrada inteligente'], ['planner', 'Distribución'],
    ['navigation', 'Navigation'], ['messages', 'Mensajes'], ['timer', 'Temporizador'],
    ['watermarks', 'Timbres'], ['kpi', 'KPI'], ['media', 'Medios'], ['crud', 'CRUD'], ['tokens', 'Tokens'],
  ];
  readonly widthExamples = [
    { label: 'RUT', width: '14ch', value: '12.345.678-5' },
    { label: 'Fecha', width: '12ch', value: '05/10/2026' },
    { label: 'Constelación', width: '22ch', value: 'Cruz del Sur' },
    { label: 'Nombre', width: '32ch', value: 'Elena Ríos · ejemplo' },
    { label: 'Correo', width: '38ch', value: 'elena.rios@example.com' },
  ];
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly monthOptions = [{value: '', label: 'Todos'}, ...this.months.map((label, index) => ({value: String(index + 1), label}))];
  readonly yearOptions = [{value: '', label: 'Todos'}, ...['2025', '2026', '2027'].map(value => ({value, label: value}))];
  filters = { month: '10', year: '2026', start: '01/10/2026', end: '31/10/2026' };
  filterMessage = '';
  actionMessage = '';
  readonly anatomyStates = ['Normal', 'Hover', 'Focus', 'Válido', 'Error', 'Readonly', 'Disabled'];
  readonly entryKinds = ['rut', 'date', 'time'] as const;
  readonly entryLabels = { rut: 'RUT', date: 'Fecha', time: 'Hora' };
  readonly entryHints = { rut: 'Escribe con o sin puntos y guion. Incluye el dígito verificador.', date: 'Escribe 05102026 o 5/10/2026.', time: 'Escribe 1840, 640 o 6:40. No necesitas escribir dos puntos.' };
  readonly entryPlaceholders = { rut: 'Ej.: 189035942', date: 'DD/MM/AAAA', time: 'Ej.: 1840' };
  entry = {
    rut: { value: '', touched: false, valid: false, error: '', normalized: '' },
    date: { value: '', touched: false, valid: false, error: '', normalized: '' },
    time: { value: '', touched: false, valid: false, error: '', normalized: '' },
  };
  apiDate: string | null = null;
  readonly layouts = [{ name: 'Desktop', width: '1040px' }, { name: 'Tablet', width: '640px' }, { name: 'Mobile', width: '320px' }];
  navMode = 'desktop';
  navCollapsed = false;
  drawerOpen = false;
  groupOpen = true;
  navSelected = 'Bandeja';
  readonly navItems = ['Bandeja', 'Personas', 'Agenda', 'Documentos', 'Reportes', 'Directorio', 'Ayuda'];
  readonly messageTypes = ['success', 'error', 'validation', 'confirmation'] as const;
  readonly messages = {
    success: { title: 'Operación exitosa', body: 'Los datos de ejemplo se guardaron correctamente.', icon: '✓' },
    error: { title: 'Error', body: 'No fue posible completar la operación de ejemplo. Intente nuevamente.', icon: '!' },
    validation: { title: 'Formulario incompleto', body: 'Complete los campos indicados para continuar.', icon: '!' },
    confirmation: { title: 'Confirmar operación', body: '¿Desea continuar con esta operación de ejemplo?', icon: '?' },
  };
  messageType: keyof typeof this.messages = 'success';
  messageResult = '';
  @ViewChild('messageDialog') messageDialog!: ElementRef<HTMLDialogElement>;
  stampState = 'CERRADO';
  readonly kpis = [
    { title: 'Pendientes', detail: 'Por revisar', value: '7', icon: '◷' },
    { title: 'Demandas activas', detail: 'En seguimiento', value: '52', icon: '▤' },
    { title: 'Registros', detail: 'Periodo de ejemplo', value: '128', icon: '▦' },
    { title: 'Avance', detail: 'Actividades completas', value: '86%', icon: '✓' },
    { title: 'Espera promedio', detail: 'Tiempo transcurrido', value: '12 días', icon: '◷' },
    { title: 'Permanencia', detail: 'Promedio de ejemplo', value: '144,8 días', icon: '◷' },
  ];

  editEntry(kind: 'rut' | 'date' | 'time'): void {
    this.entry[kind].touched = false;
    this.entry[kind].error = '';
    this.entry[kind].valid = false;
    this.entry[kind].normalized = '';
    if (kind === 'date') this.apiDate = null;
  }

  finishEntry(kind: 'rut' | 'date' | 'time'): void {
    const field = this.entry[kind];
    field.touched = true;
    const validate = { rut: validateRut, date: validateDate, time: validateTime }[kind];
    const normalize = { rut: normalizeRut, date: normalizeDate, time: normalizeTime }[kind];
    const format = { rut: formatRut, date: formatDate, time: formatTime }[kind];
    field.valid = validate(field.value);
    field.error = !field.value.trim() ? 'Este campo es obligatorio.' : field.valid ? '' : {
      rut: 'RUT inválido. Revise el número ingresado.',
      date: 'Fecha inválida. Revise el día, mes y año.',
      time: 'Hora inválida. Ingrese una hora entre 00:00 y 23:59.',
    }[kind];
    field.normalized = field.valid ? normalize(field.value) : '';
    if (field.valid) field.value = format(field.value);
    if (kind === 'date') this.apiDate = toApiDate(field.value);
  }

  selectNav(item: string): void {
    this.navSelected = item;
    this.drawerOpen = false;
  }

  openMessage(type: keyof typeof this.messages): void {
    this.messageType = type;
    this.messageResult = '';
    this.messageDialog.nativeElement.returnValue = '';
    this.messageDialog.nativeElement.showModal();
  }

  closeMessage(result: string): void {
    this.messageDialog.nativeElement.close(result);
  }

  applyFilters(): void {
    const start = toApiDate(this.filters.start);
    const end = toApiDate(this.filters.end);
    if ((this.filters.start && !start) || (this.filters.end && !end)) {
      this.filterMessage = 'Revise las fechas. Use DD/MM/YYYY y una fecha real.';
      return;
    }
    this.filterMessage = start && end && start > end
      ? 'Revisa el rango: la fecha inicial es posterior a la final.'
      : 'Vista de demostración actualizada. No se consultaron datos reales.';
  }

  clearFilters(): void {
    this.filters = { month: '', year: '', start: '', end: '' };
    this.filterMessage = 'Filtros de demostración vacíos.';
  }

  showAction(): void {
    this.actionMessage = 'Acción de demostración ejecutada, sin guardar datos.';
  }
}
