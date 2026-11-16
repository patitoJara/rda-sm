import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabTooltipDirective } from './ui-lab-tooltip.directive';
import { LabPopoverDirective } from './ui-lab-popover.directive';
import { formatDate, formatTime, toApiDate, validateDate, validateTime } from './ui-lab-input.utils';

export interface LabOption { value: string; label: string; disabled?: boolean; }

/** UI Lab only. Anchored field picker, not a production combobox/date adapter. */
@Component({
  selector: 'app-lab-picker', standalone: true, imports: [FormsModule, LabPopoverDirective, LabTooltipDirective],
  templateUrl: './ui-lab-picker.component.html', styleUrl: './ui-lab-picker.component.scss',
})
export class UiLabPickerComponent implements OnChanges {
  private static nextId = 0;
  readonly id = `lab-picker-${UiLabPickerComponent.nextId++}`;
  @Input() label = '';
  @Input() kind: 'date' | 'time' | 'select' = 'date';
  @Input() value = '';
  @Input() options: LabOption[] = [];
  @Input() disabled = false;
  @Input() required = false;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('popup') popup!: ElementRef<HTMLElement>;
  @ViewChild(LabPopoverDirective) popover!: LabPopoverDirective;
  @ViewChild('trigger') trigger!: ElementRef<HTMLButtonElement>;
  error = '';
  opened = false;
  year = 2026;
  month = 9;
  focusDay = 1;
  hour = 10;
  minute = 30;
  readonly weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.error = '';
  }
  get selectedLabel(): string { return this.options.find(option => option.value === this.value)?.label ?? 'Seleccionar'; }
  get days(): number[] {
    const date = new Date(0);
    date.setUTCFullYear(this.year, this.month, 1);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCFullYear(this.year, this.month + 1, 0);
    return [...Array(offset).fill(0), ...Array.from({ length: date.getUTCDate() }, (_, i) => i + 1)];
  }
  dayValue(day: number): string { return `${String(day).padStart(2, '0')}/${String(this.month + 1).padStart(2, '0')}/${String(this.year).padStart(4, '0')}`; }
  edit(value: string): void { this.value = value; this.error = ''; this.valueChange.emit(value); }
  finish(): void {
    if (!this.value.trim()) { this.error = ''; return; }
    const valid = this.kind === 'date' ? validateDate(this.value) : validateTime(this.value);
    this.error = valid ? '' : this.kind === 'date' ? 'Fecha inválida. Revise día, mes y año.' : 'Ingrese una hora entre 00:00 y 23:59.';
    if (valid) this.edit(this.kind === 'date' ? formatDate(this.value) : formatTime(this.value));
  }
  open(fromKeyboard = false): void {
    if (this.disabled) return;
    const api = toApiDate(this.value);
    if (this.kind === 'date' && api) {
      const [year, month, day] = api.split('-').map(Number);
      this.year = year; this.month = month - 1; this.focusDay = day;
    }
    if (this.kind === 'time' && validateTime(this.value)) [this.hour, this.minute] = formatTime(this.value).split(':').map(Number);
    const selected = this.options.some(option => option.value === this.value && !option.disabled);
    const selector = this.kind === 'date' ? `[data-day="${this.focusDay}"]` : this.kind === 'select' ? selected ? '[data-option][aria-selected="true"]' : '[data-option]:not(:disabled)' : 'input';
    if (fromKeyboard) this.popover.focusFirst(selector);
    else this.popover.open(selector);
    this.opened = this.popover.opened;
  }
  close(): void { this.popover.close(); }
  choose(value: string): void { this.edit(value); this.close(); }
  changeMonth(delta: number): void {
    const index = this.year * 12 + this.month + delta;
    if (index < 12 || index > 9999 * 12 + 11) return;
    this.year = Math.floor(index / 12); this.month = index % 12; this.focusDay = 1;
  }
  moveDay(event: KeyboardEvent, day: number): void {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in moves) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const date = new Date(0); date.setUTCFullYear(this.year, this.month, day);
    const weekday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(day + (event.key === 'Home' ? -weekday : event.key === 'End' ? 6 - weekday : moves[event.key]));
    if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return;
    this.year = date.getUTCFullYear(); this.month = date.getUTCMonth(); this.focusDay = date.getUTCDate();
    setTimeout(() => this.popup.nativeElement.querySelector<HTMLButtonElement>(`[data-day="${this.focusDay}"]`)?.focus());
  }
  moveOption(event: KeyboardEvent): void {
    const options = Array.from(this.popup.nativeElement.querySelectorAll<HTMLButtonElement>('[data-option]:not(:disabled)'));
    const index = options.indexOf(event.target as HTMLButtonElement);
    let next = index;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault(); options[next]?.focus();
  }
  applyTime(): void {
    const value = `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    if (validateTime(value)) this.choose(value);
    else this.error = 'Ingrese una hora entre 00:00 y 23:59.';
  }
  stepTime(part: 'hour' | 'minute', delta: number): void {
    const maximum = part === 'hour' ? 23 : 59;
    this[part] = (Number(this[part] || 0) + delta + maximum + 1) % (maximum + 1);
  }
}
