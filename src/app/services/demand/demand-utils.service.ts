// C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\services\demand\demand-utils.service.ts

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class DemandUtilsService {
  constructor() {}

  // ============================================================
  // 🔍 VALIDACIÓN PROFUNDA DE IDS
  // ============================================================
  validateIdsDeep(obj: any, path: string = ''): void {
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const value = obj[key];
      const fullPath = path ? `${path}.${key}` : key;

      if (key === 'id') {
        if (
          value === null ||
          value === undefined ||
          value === 0 ||
          Number.isNaN(Number(value))
        ) {
          console.error(`❌ ID inválido → ${fullPath}:`, value);
        } else {
          console.log(`✅ ID OK → ${fullPath}:`, value);
        }
      }

      if (typeof value === 'object' && value !== null) {
        this.validateIdsDeep(value, fullPath);
      }
    }
  }

  // ============================================================
  // 🕒 HORA ACTUAL
  // ============================================================

  getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

  // ============================================================
  // 🔘 VALIDAR SUSTANCIA PRINCIPAL
  // ============================================================
  validatePrincipal(form: FormGroup): boolean {
    const principal = form.get('substance');

    if (!principal?.value) {
      principal?.setErrors({ required: true });
      principal?.markAsTouched();
      return false;
    }

    // Limpia error si ahora es válido
    if (principal.hasError('required')) {
      principal.setErrors(null);
    }

    return true;
  }

  // ============================================================
  // 🔘 SELECCIONAR SUSTANCIA PRINCIPAL
  // ============================================================
  selectPrincipal(form: FormGroup, id: number): void {
    const secundarias: number[] = form.value.secondarySubstances || [];

    form.patchValue({
      substance: id,
      secondarySubstances: secundarias.filter((s) => s !== id),
    });
    form.markAsDirty();
    form.markAsTouched();
  }

  // ============================================================
  // 🔘 TOGGLE SUSTANCIA SECUNDARIA
  // ============================================================
  toggleSecondary(form: FormGroup, id: number): void {
    const principal = form.value.substance;
    let secundarias: number[] = [...(form.value.secondarySubstances || [])];

    if (principal === id) {
      form.patchValue({ substance: null });
    }

    if (secundarias.includes(id)) {
      secundarias = secundarias.filter((x) => x !== id);
    } else {
      secundarias.push(id);
    }

    form.patchValue({ secondarySubstances: secundarias });
    form.markAsDirty();
    form.markAsTouched();
  }

  // ============================================================
  // 🟦 CARGAR SOLO DATOS DEL POSTULANTE
  // ============================================================
  cargarDatosPostulanteEnFormulario(form: FormGroup, p: any): void {
    if (!p) return;

    form.patchValue({
      rut: p.rut ?? '',
      firstName: p.firstName ?? '',
      secondName: p.lastName ?? '',
      firstLastName: p.firstLastName ?? '',
      secondLastName: p.secondLastName ?? '',
      birthDate: p.birthdate ? new Date(p.birthdate) : null,
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      sex: p.sex?.id ?? null,
      commune: p.commune?.id ?? null,
    });

    if (p.convPrev?.intPrev?.id) {
      form.patchValue({ intPrev: p.convPrev.intPrev.id });
    }

    if (p.convPrev?.id) {
      const ctrl = form.get('convPrev');
      ctrl?.enable({ emitEvent: false });
      ctrl?.setValue(p.convPrev.id);
    }
  }

  // ============================================================
  // 🟦 CARGAR FICHA COMPLETA (REGISTER)
  // ============================================================

  /**
   * ⚠️ IMPORTANTE
   * Este método SOLO carga datos.
   * Quien lo invoque es responsable de decidir
   * si el formulario debe quedar pristine o dirty.
   */

  cargarFichaCompletaEnFormulario(form: FormGroup, f: any): void {
    if (!f) return;

    const p = f.postulant;
    if (p) {
      this.cargarDatosPostulanteEnFormulario(form, p);
    }

    /*
    form.patchValue({
      ntrat: Number(f.number_tto) || 0,

      // ⚠️ IMPORTANTE: estos campos son selection-list (array)
      contactTypes: f.contactType?.id ? [f.contactType.id] : [],
      senders: f.sender?.id ? [f.sender.id] : [],
      diverters: f.diverter?.id ? [f.diverter.id] : [],

      state: f.state?.id ?? null,
      result: f.result?.id ?? null,
      fechaSolicitud: f.date_attention ? new Date(f.date_attention) : null,

      // ✅ CLAVE: nombre correcto y SIEMPRE cargado
      registerDescription: f.description ?? '',
    });
    */

    form.patchValue({
      // ✔ number
      ntrat: Number(f.number_tto) || 0,

      // ✅ AHORA SON mat-select (VALOR SIMPLE)
      contactTypes: f.contactType?.id ?? null,
      senders: f.sender?.id ?? null,
      diverters: f.diverter?.id ?? null,

      state: f.state?.id ?? null,
      result: f.result?.id ?? null,
      notRelevants: f.notRelevant?.id ?? null, 
      // ⚠️ mat-datepicker acepta Date
      fechaSolicitud: f.date_attention ? new Date(f.date_attention) : null,

      registerDescription: f.description ?? '',
    });
  }

  // ============================================================
  // 🟦 CARGAR CONTACTO (REFERENTE)
  // ============================================================
  cargarDatosContactoEnFormulario(form: FormGroup, postulant: any): void {
    const contacto = postulant?.contacts?.length ? postulant.contacts[0] : null;

    if (!contacto) return;

    form.patchValue({
      name: contacto.name ?? '',
      cellphone: contacto.cellphone ?? '',
      emailPostulant: contacto.email ?? '',

      // ✅ nombre correcto
      contactDescription: contacto.description ?? '',
    });
  }

  getEdadDesdeFecha(fechaNacimiento: Date | string | null): number | null {
    if (!fechaNacimiento) return null;

    const birth =
      fechaNacimiento instanceof Date
        ? fechaNacimiento
        : new Date(fechaNacimiento);

    // 🔥 VALIDACIÓN CLAVE (te faltaba esto)
    if (isNaN(birth.getTime())) return null;

    const today = new Date();

    let edad = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      edad--;
    }

    return edad;
  }
}
