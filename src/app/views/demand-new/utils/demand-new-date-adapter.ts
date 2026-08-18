import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class DemandNewDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = String(value).trim();

    let day: number;
    let month: number;
    let year: number;

    /*
     * Formato con separadores:
     * 1/6/2026
     * 01/06/2026
     * 16/8/2026
     */
    const slashMatch = text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

    if (slashMatch) {
      day = Number(slashMatch[1]);
      month = Number(slashMatch[2]);
      year = Number(slashMatch[3]);
    } else {
      /*
       * Solo números.
       *
       * 8 dígitos:
       * DDMMAAAA
       * 16082026 -> 16/08/2026
       *
       * 7 dígitos:
       * DDMYYYY
       * 1062026 -> 10/06/2026
       *
       * 6 dígitos:
       * DMAAAA
       * 162026 -> 01/06/2026
       */
      const digits = text.replace(/\D/g, '');

      if (digits.length === 8) {
        day = Number(digits.slice(0, 2));
        month = Number(digits.slice(2, 4));
        year = Number(digits.slice(4, 8));
      } else if (digits.length === 7) {
        day = Number(digits.slice(0, 2));
        month = Number(digits.slice(2, 3));
        year = Number(digits.slice(3, 7));
      } else if (digits.length === 6) {
        day = Number(digits.slice(0, 1));
        month = Number(digits.slice(1, 2));
        year = Number(digits.slice(2, 6));
      } else {
        return null;
      }
    }

    if (
      !Number.isInteger(day) ||
      !Number.isInteger(month) ||
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1
    ) {
      return null;
    }

    /*
     * Si el día no existe para ese mes,
     * se ajusta al último día válido.
     */
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    day = Math.min(day, lastDayOfMonth);

    return new Date(year, month - 1, day);
  }

  override format(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }
}

export const DEMAND_NEW_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};