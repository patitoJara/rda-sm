import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

interface FeedbackResultHelp {
  icon: string;
  title: string;
  message: string;
  tone: 'neutral' | 'warning' | 'success' | 'danger';
}

@Component({
  selector: 'app-feedback-panel',
  standalone: true,
  templateUrl: './feedback-panel.component.html',
  styleUrls: ['./feedback-panel.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
})
export class FeedbackPanelComponent {
  @Input({ required: true }) form!: FormGroup;

  @Input() success: string | null = null;
  @Input() error: string | null = null;

  @Input() professionals: any[] = [];
  @Input() commitmentLevels: any[] = [];
  @Input() results: any[] = [];

  @Output() professionalChange = new EventEmitter<number | null>();
  @Output() hourBlur = new EventEmitter<void>();

  get selectedResultHelp(): FeedbackResultHelp {
    const selectedCode = this.form?.get('resultCode')?.value;

    const selectedResult = this.results.find(
      (item) =>
        String(item?.code ?? '') === String(selectedCode ?? ''),
    );

    const value = this.normalize(
      `${selectedResult?.code ?? ''} ${selectedResult?.name ?? ''}`,
    );

    if (!value) {
      return {
        icon: 'info',
        title: 'Seleccione un resultado',
        message:
          'Antes de guardar se informará si la demanda permanece abierta, si se cierra la atención del programa actual o si se cierra el episodio.',
        tone: 'neutral',
      };
    }

    if (value.includes('LISTA') && value.includes('ESPERA')) {
      return {
        icon: 'hourglass_top',
        title: 'La demanda permanecerá abierta',
        message:
          'La persona continuará en lista de espera en el programa actual y seguirá acumulando días.',
        tone: 'warning',
      };
    }

    if (value.includes('REFER')) {
      return {
        icon: 'swap_horiz',
        title: 'Se cerrará la atención del programa actual',
        message:
          'El episodio permanecerá abierto y continuará en el programa receptor, conservando los días acumulados.',
        tone: 'warning',
      };
    }

    if (value.includes('INGRESO') && value.includes('TRATAMIENTO')) {
      return {
        icon: 'check_circle',
        title: 'Se cerrará el episodio',
        message:
          'Se cerrará la atención del programa actual, se cerrará el episodio y se detendrá el conteo de espera.',
        tone: 'success',
      };
    }

    if (value.includes('ABANDONO')) {
      return {
        icon: 'cancel',
        title: 'Se cerrará el episodio',
        message:
          'Se cerrará la atención del programa actual, se cerrará el episodio y se detendrá el conteo de espera.',
        tone: 'danger',
      };
    }

    return {
      icon: 'info',
      title: 'Revise el efecto del resultado',
      message:
        'El sistema solicitará confirmación antes de ejecutar cualquier cierre asociado.',
      tone: 'neutral',
    };
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }
}
