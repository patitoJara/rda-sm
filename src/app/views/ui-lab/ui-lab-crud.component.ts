import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiLabPickerComponent } from './ui-lab-picker.component';
import { LabPopoverDirective } from './ui-lab-popover.directive';
import { LabTooltipDirective } from './ui-lab-tooltip.directive';
import { formatRut, toApiDate, validateRut } from './ui-lab-input.utils';
import { LabRecord, LabSortKey, makeLabRecords, queryLabRecords } from './ui-lab-crud.utils';

@Component({selector: 'app-lab-crud', standalone: true,
  imports: [FormsModule, NgTemplateOutlet, UiLabPickerComponent, LabPopoverDirective, LabTooltipDirective],
  templateUrl: './ui-lab-crud.component.html', styleUrl: './ui-lab-crud.component.scss'})
export class UiLabCrudComponent implements AfterViewInit, OnDestroy {
  records = makeLabRecords();
  search = ''; stateFilter = ''; programFilter = ''; page = 1; pageSize = '10';
  sortKey: LabSortKey | '' = ''; direction: 'asc' | 'desc' | '' = '';
  density = '40'; filterLayout = 'inline'; filtersVisible = true; actionLayout = 'mixed'; listState = 'ready';
  selected = new Set<number>();
  readonly columns: {key: LabSortKey; label: string; css: string}[] = [
    {key: 'code', label: 'Código', css: 'code'}, {key: 'name', label: 'Nombre', css: 'name'},
    {key: 'rut', label: 'RUT', css: 'rut'}, {key: 'program', label: 'Programa', css: 'program'},
    {key: 'date', label: 'Fecha', css: 'date'}, {key: 'state', label: 'Estado', css: 'state'},
    {key: 'responsible', label: 'Responsable', css: 'responsible'}, {key: 'count', label: 'Gestiones', css: 'number'},
  ];
  readonly densityOptions = [{value: '36', label: '36px · más denso'}, {value: '40', label: '40px · candidato principal'}, {value: '44', label: '44px · más relajado'}];
  preview = 'auto';
  readonly previews = [{value: 'auto', label: 'Ancho disponible'}, {value: 'desktop', label: 'Desktop · 1280px'}, {value: 'tablet', label: 'Tablet · 800px'}, {value: 'mobile', label: 'Mobile · 360px'}];
  get previewWidth(): string { return ({desktop: '1280px', tablet: '800px', mobile: '360px'} as Record<string, string>)[this.preview] ?? '100%'; }
  readonly filterLayouts = [{value: 'inline', label: 'Inline'}, {value: 'popover', label: 'Popover'}, {value: 'panel', label: 'Panel expandible'}];
  readonly actionLayouts = [{value: 'mixed', label: 'Ver + editar + más'}, {value: 'direct', label: 'Iconos directos'}];
  readonly listStates = [{value: 'ready', label: 'Con datos'}, {value: 'loading', label: 'Cargando'}, {value: 'empty', label: 'Vacío'}, {value: 'no-results', label: 'Sin resultados'}, {value: 'error', label: 'Error'}];
  readonly stateOptions = ['Activo', 'Pendiente', 'Cerrado'].map(value => ({value, label: value}));
  readonly programOptions = ['Programa Norte', 'Programa Sur', 'Programa de acompañamiento comunitario'].map(value => ({value, label: value}));
  readonly filterStates = [{value: '', label: 'Todos los estados'}, ...this.stateOptions];
  readonly filterPrograms = [{value: '', label: 'Todos los programas'}, ...this.programOptions];
  readonly sizes = ['5', '10', '20'].map(value => ({value, label: `${value} por página`}));
  mode: 'view' | 'edit' | 'create' = 'view';
  draft = {...this.records[0], date: '01/10/2026'};
  formError = ''; saving = false;
  pendingDelete?: LabRecord;
  drawerOpen = false; discardPrompt = false;
  toastClearance = 96;
  private footerObserver?: ResizeObserver;
  @ViewChild('drawerFooter') drawerFooter!: ElementRef<HTMLElement>;
  ngAfterViewInit(): void {
    this.footerObserver = new ResizeObserver(() => {
      this.toastClearance = Math.max(96, Math.ceil(this.drawerFooter.nativeElement.getBoundingClientRect().height) + 18);
    });
    this.footerObserver.observe(this.drawerFooter.nativeElement);
  }
  private baseline = '';
  private drawerOrigin?: HTMLElement;
  private pendingEditor?: () => void;
  @ViewChild('drawer') drawer!: ElementRef<HTMLDialogElement>;
  @ViewChild('listTitle') listTitle!: ElementRef<HTMLElement>;
  toasts: {id: number; message: string; remaining: number; started: number; hover: boolean; focus: boolean; timer?: ReturnType<typeof setTimeout>}[] = [];
  private toastId = 0;
  @ViewChild('toastStack') toastStack!: ElementRef<HTMLElement>;
  announcement = '';
  multiDisplay = 'chips'; multiSearch = ''; expandSelection = false;
  readonly multiDisplays = [{value: 'chips', label: 'Chips compactos'}, {value: 'summary', label: 'Resumen textual'}];
  readonly multiOptions = Array.from({length: 16}, (_, i) => ({value: `Programa de muestra ${i + 1}`, label: `Programa de muestra ${i + 1}`, disabled: i === 15}));
  get filteredMultiOptions() { return this.multiOptions.filter(option => option.label.toLowerCase().includes(this.multiSearch.toLowerCase())); }
  get selectedPrograms() { return Array.from(this.multiSelection); }
  get dirty(): boolean { return this.drawerOpen && this.mode !== 'view' && this.baseline !== JSON.stringify(this.draft); }
  setMultiSample(count: number): void { this.multiSelection = new Set(this.multiOptions.slice(0, count).map(option => option.value)); this.expandSelection = false; }
  showAutocomplete(state: string, popup: LabPopoverDirective, input: HTMLInputElement): void {
    this.autocomplete = state === 'empty' ? 'Sin coincidencia 999' : state === 'selected' ? this.people[0] : 'Profesional';
    this.autoChoice = state === 'selected' ? this.people[0] : '';
    input.focus(); if (!popup.opened) popup.open(null);
  }
  requestClose(): void {
    if (this.saving) return;
    if (this.dirty) { this.pendingEditor = undefined; this.discardPrompt = true; return; }
    this.closeDrawer();
  }
  discardChanges(): void {
    const next = this.pendingEditor;
    this.baseline = JSON.stringify(this.draft); this.discardPrompt = false; this.pendingEditor = undefined;
    if (next) next(); else this.closeDrawer();
  }
  keepEditing(): void { this.discardPrompt = false; this.pendingEditor = undefined; this.editorTitle.nativeElement.focus(); }
  private closeDrawer(): void {
    this.drawer.nativeElement.close(); this.drawerOpen = false; this.discardPrompt = false;
    if (this.drawerOrigin?.isConnected) this.drawerOrigin.focus(); else this.listTitle.nativeElement.focus();
  }
  private saveTimer?: ReturnType<typeof setTimeout>;
  @ViewChild('deleteDialog') deleteDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('editorTitle') editorTitle!: ElementRef<HTMLElement>;
  private actionOrigin?: HTMLElement;
  autocomplete = ''; autoChoice = ''; multiSelection = new Set<string>();
  readonly people = ['Profesional de ejemplo 1', 'Profesional de ejemplo 2', 'Profesional de ejemplo 3', 'Profesional de ejemplo 4', 'Profesional de ejemplo 5'];
  get suggestions() { return this.people.filter(name => name.toLowerCase().includes(this.autocomplete.toLowerCase())); }
  get result() { return queryLabRecords(this.listState === 'empty' || this.listState === 'no-results' ? [] : this.records, {search: this.search, state: this.stateFilter, program: this.programFilter, sortKey: this.sortKey, direction: this.direction, page: this.page, pageSize: Number(this.pageSize)}); }
  get pageNumbers() { const result = this.result; return Array.from({length: result.pages}, (_, i) => i + 1).filter(page => page === 1 || page === result.pages || Math.abs(page - result.page) <= 1); }
  get allPageSelected() { return this.result.rows.length > 0 && this.result.rows.every(row => this.selected.has(row.id)); }
  get somePageSelected() { return this.result.rows.some(row => this.selected.has(row.id)) && !this.allPageSelected; }
  resetPage(): void { this.page = 1; this.selected.clear(); }
  clearFilters(): void { this.search = ''; this.stateFilter = ''; this.programFilter = ''; this.listState = 'ready'; this.resetPage(); }
  sort(key: LabSortKey): void {
    if (this.sortKey !== key) { this.sortKey = key; this.direction = 'asc'; }
    else if (this.direction === 'asc') this.direction = 'desc';
    else { this.sortKey = ''; this.direction = ''; }
    this.page = 1;
  }
  sortLabel(key: LabSortKey): string { return this.sortKey !== key ? 'none' : this.direction === 'asc' ? 'ascending' : 'descending'; }
  toggleRow(id: number): void { this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id); }
  togglePage(): void { const all = this.allPageSelected; this.result.rows.forEach(row => all ? this.selected.delete(row.id) : this.selected.add(row.id)); }
  displayDate(value: string): string { return value.split('-').reverse().join('/'); }
  openEditor(mode: 'view' | 'edit' | 'create', record?: LabRecord, focus = true): void {
    if (this.saving) return;
    if (this.dirty) {
      this.pendingEditor = () => this.openEditor(mode, record, focus);
      this.discardPrompt = true; this.editorTitle.nativeElement.focus(); return;
    }
    if (!this.drawerOpen) this.drawerOrigin = document.activeElement as HTMLElement;
    this.mode = mode; this.formError = ''; this.discardPrompt = false;
    const source = record ?? this.records.find(row => row.id === this.draft.id) ?? this.records[0];
    this.draft = mode === 'create' || !source
      ? {id: 0, code: 'Se asigna al guardar', name: '', rut: '', program: '', date: '', state: 'Pendiente', responsible: '', count: 0}
      : {...source, date: this.displayDate(source.date)};
    this.baseline = JSON.stringify(this.draft);
    this.drawerOpen = true;
    if (!this.drawer.nativeElement.open) this.drawer.nativeElement.show();
    if (focus) this.editorTitle.nativeElement.focus();
  }
  formatDraftRut(): void { if (validateRut(this.draft.rut)) this.draft.rut = formatRut(this.draft.rut); }
  save(): void {
    if (this.saving || this.mode === 'view') return;
    const date = toApiDate(this.draft.date);
    if (!this.draft.name.trim() || !validateRut(this.draft.rut) || !date || !this.draft.program) {
      this.formError = 'Complete nombre y programa, revise el RUT y escriba una fecha válida. Sus datos se conservan.'; return;
    }
    this.formError = ''; this.saving = true;
    const creating = this.mode === 'create';
    const saved: LabRecord = {...this.draft, date, rut: formatRut(this.draft.rut)};
    this.saveTimer = setTimeout(() => {
      if (creating) {
        saved.id = Math.max(0, ...this.records.map(row => row.id)) + 1;
        saved.code = `LAB-${String(saved.id).padStart(3, '0')}`;
        this.records = [...this.records, saved];
      } else this.records = this.records.map(row => row.id === saved.id ? saved : row);
      this.saving = false; this.listState = 'ready';
      this.baseline = JSON.stringify(this.draft);
      this.openEditor('view', saved);
      this.notify(creating ? 'Registro guardado. Solo en esta demostración.' : 'Cambios actualizados. Solo en esta demostración.');
    }, 1200);
  }
  askDelete(row: LabRecord, origin: HTMLElement): void {
    this.pendingDelete = row; this.actionOrigin = origin;
    this.deleteDialog.nativeElement.showModal();
  }
  cancelDelete(): void { this.deleteDialog.nativeElement.close(); }
  restoreActionFocus(): void { if (this.actionOrigin?.isConnected) this.actionOrigin.focus(); else this.listTitle.nativeElement.focus(); }
  confirmDelete(): void {
    if (!this.pendingDelete) return;
    const id = this.pendingDelete.id;
    this.records = this.records.filter(row => row.id !== id);
    this.selected.delete(id); this.pendingDelete = undefined;
    if (this.drawerOpen && this.draft.id === id) this.closeDrawer();
    this.deleteDialog.nativeElement.close();
    this.announcement = 'Registro eliminado de la muestra local.';
  }
  duplicate(row: LabRecord): void {
    if (this.saving) return;
    if (this.dirty) { this.pendingEditor = () => this.duplicate(row); this.discardPrompt = true; this.editorTitle.nativeElement.focus(); return; }
    this.openEditor('create');
    this.draft = {...row, id: 0, code: 'Se asigna al guardar', name: row.name + ' · copia', date: this.displayDate(row.date)};
  }
  notify(message: string): void {
    const toast = {id: ++this.toastId, message, remaining: 6500, started: Date.now(), hover: false, focus: false};
    this.toasts = [...this.toasts, toast]; this.scheduleToast(toast);
  }
  private scheduleToast(toast: typeof this.toasts[number]): void {
    toast.started = Date.now(); toast.timer = setTimeout(() => this.closeToast(toast.id), toast.remaining);
  }
  pauseToast(id: number, reason: 'hover' | 'focus', paused: boolean): void {
    const toast = this.toasts.find(item => item.id === id); if (!toast) return;
    const wasPaused = toast.hover || toast.focus;
    toast[reason] = paused;
    if (!wasPaused && (toast.hover || toast.focus)) {
      clearTimeout(toast.timer); toast.remaining = Math.max(0, toast.remaining - (Date.now() - toast.started));
    } else if (wasPaused && !toast.hover && !toast.focus) this.scheduleToast(toast);
  }
  closeToast(id: number): void {
    const toast = this.toasts.find(item => item.id === id); if (!toast) return;
    const focused = this.toastStack?.nativeElement.querySelector(`[data-toast-id="${id}"]`)?.contains(document.activeElement);
    clearTimeout(toast.timer); this.toasts = this.toasts.filter(item => item.id !== id);
    if (focused) (this.drawerOpen ? this.editorTitle : this.listTitle).nativeElement.focus();
  }
  bulkState(): void { this.records = this.records.map(row => this.selected.has(row.id) ? {...row, state: 'Activo'} : row); this.notify('Estado cambiado en los registros de muestra seleccionados.'); }
  moveOption(event: KeyboardEvent, container: HTMLElement): void {
    const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-option]:not(:disabled)'));
    let index = nodes.indexOf(event.target as HTMLElement);
    if (event.key === 'ArrowDown') index = (index + 1) % nodes.length;
    else if (event.key === 'ArrowUp') index = (index - 1 + nodes.length) % nodes.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = nodes.length - 1;
    else return;
    event.preventDefault(); nodes[index]?.focus();
  }
  toggleMulti(value: string): void { this.multiSelection.has(value) ? this.multiSelection.delete(value) : this.multiSelection.add(value); }
  ngOnDestroy(): void { this.footerObserver?.disconnect(); clearTimeout(this.saveTimer); this.toasts.forEach(toast => clearTimeout(toast.timer)); }
}
