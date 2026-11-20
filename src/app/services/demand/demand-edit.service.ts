import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PostulantService } from '@app/services/postulant.service';
import { RegisterService } from '@app/services/register.service';
import { RegisterSubstanceService } from '@app/services/register-substance.service';
import { TokenService } from '@app/services/token.service';

import { Postulant } from '@app/models/postulant';

@Injectable({
  providedIn: 'root',
})
export class DemandEditService {
  constructor(
    private postulantService: PostulantService,
    private registerService: RegisterService,
    private registerSubstanceService: RegisterSubstanceService,
    private tokenService: TokenService
  ) {}

  // ============================================================
  // 🟦 VALIDAR QUE LA FICHA PERTENECE AL PROGRAMA ACTIVO
  // ============================================================
  canEditRecord(record: any): boolean {
    const activeProgram = this.tokenService.getActiveProgram();
    if (!activeProgram) return false;

    const programs = JSON.parse(sessionStorage.getItem('programs') || '[]');
    const active = programs.find((p: any) => p.name === activeProgram);
    if (!active) return false;

    return Number(record.program?.id) === Number(active.id);
  }

  // ============================================================
  // 🟦 ACTUALIZAR POSTULANTE
  // ============================================================
  async updatePostulant(form: FormGroup, postulant: any): Promise<any> {
    const payload: Partial<Postulant> = {
      id: postulant.id,
      user: { id: postulant.user.id },

      commune: { id: Number(form.value.commune) },
      sex: { id: Number(form.value.sex) },

      convPrev: {
        id: Number(form.value.convPrev),
        intPrev: { id: Number(form.value.intPrev) },
      },

      firstName: form.value.firstName,
      lastName: form.value.secondName,
      firstLastName: form.value.firstLastName,
      secondLastName: form.value.secondLastName,

      rut: form.value.rut,
      birthdate: form.value.birthDate
        ? new Date(form.value.birthDate).toISOString().split('T')[0]
        : undefined,

      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
      suicideRiskFlag: form.get('suicideRiskFlag')
        ? form.get('suicideRiskFlag')!.value
        : (postulant.suicideRiskFlag ?? null),
    };

    return this.postulantService.update(postulant.id, payload);
  }

  // ============================================================
  // 🟦 ACTUALIZAR REGISTER
  // ============================================================
  async updateRegister(form: FormGroup, register: any): Promise<any> {
    const payload = {
      postulant: { id: register.postulant.id },
      program: { id: register.program.id },
      user: { id: register.user.id },

      contactType: { id: Number(form.value.contactTypes) },
      sender: { id: Number(form.value.senders) },
      diverter: { id: Number(form.value.diverters) },

      number_tto: String(form.value.ntrat),
      description: form.value.observaciones || '',

      result: { id: Number(form.value.result) },
      state: { id: Number(form.value.state) },

      date_attention: register.date_attention,
      is_history: register.is_history,
    };

    return firstValueFrom(this.registerService.update(register.id, payload));
  }

  // ============================================================
  // 🟦 ACTUALIZAR SUSTANCIAS
  // ============================================================
  async updateSubstances(form: FormGroup, register: any): Promise<void> {
    // 🔥 Estrategia clara: borrar y recrear
    await firstValueFrom(
      this.registerSubstanceService.deleteByRegisterId(register.id)
    );

    const principal = form.value.substance;
    const secondaries = form.value.secondarySubstances || [];

    if (principal) {
      await firstValueFrom(
        this.registerSubstanceService.create({
          register: { id: register.id },
          substance: { id: Number(principal) },
          level: { id: 1 }, // Principal
        })
      );
    }

    for (const s of secondaries) {
      await firstValueFrom(
        this.registerSubstanceService.create({
          register: { id: register.id },
          substance: { id: Number(s) },
          level: { id: 2 }, // Secundaria
        })
      );
    }
  }

  // ============================================================
  // 🟦 MÉTODO PRINCIPAL
  // ============================================================
  async editFullRecord(form: FormGroup, record: any): Promise<any> {
    if (!this.canEditRecord(record)) {
      throw new Error('❌ La ficha no pertenece al programa activo.');
    }

    await this.updatePostulant(form, record.postulant);
    const updatedRegister = await this.updateRegister(form, record);

    // 🟡 Movimientos NO se gestionan aquí
    await this.updateSubstances(form, updatedRegister);

    return updatedRegister;
  }
}
