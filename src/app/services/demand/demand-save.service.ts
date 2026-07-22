import { Injectable } from '@angular/core';
import { Observable, forkJoin, from, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';

import { formatDate } from '@angular/common';

import { TokenService } from '@app/services/token.service';
import { PostulantService } from '@app/services/postulant.service';
import { ContactService } from '@app/services/contact.service';
import { RegisterService } from '@app/services/register.service';
import { RegisterMovementService } from '@app/services/register-movement.service';
import { RegisterSubstanceService } from '@app/services/register-substance.service';

@Injectable({
  providedIn: 'root',
})
export class DemandSaveService {

  constructor(
    private tokenService: TokenService,
    private postulantService: PostulantService,
    private contactService: ContactService,
    private registerService: RegisterService,
    private movementService: RegisterMovementService,
    private registerSubstanceService: RegisterSubstanceService,
  ) {}

  /**
   * ============================================================
   * ðŸ”µ SAVE DEMAND (full pipeline)
   * ============================================================
   */
  saveDemand(form: any): Observable<any> {
    console.log('%cðŸš€ Iniciando SAVE DEMAND', 'color:#4caf50; font-size:16px');

    //const userId = this.tokenService.getUserId();
    const userId = this.tokenService.getUserProfile()?.id ?? null;


    const programObj = this.getActiveProgramObj();

    if (!userId || !programObj?.id) {
      return of({ error: 'âŒ SesiÃ³n invÃ¡lida o programa no encontrado.' });
    }

    // TransformaciÃ³n de campos
    const payloads = this.buildPayloads(form, userId, programObj.id);

    // ============================================================
    // ðŸŸ¦ PASO 1 â†’ CREAR POSTULANTE
    // ============================================================
    return this.postulantService.create(payloads.postulant).pipe(
      switchMap((postulant: any) => {
        console.log('ðŸŸ¢ Postulante creado:', postulant);

        // Reemplazar ID real
        payloads.contact.postulantId = postulant.id;
        payloads.register.postulant.id = postulant.id;

        // ============================================================
        // PASO 2 â†’ CREAR CONTACTO (opcional)
        // ============================================================
        return this.contactService.createDto(payloads.contact).pipe(
          catchError(() => {
            console.warn('âš  No se pudo crear contacto (no bloqueante)');
            return of(null);
          }),
          map((contact) => ({ postulant, contact }))
        );
      }),

      // ============================================================
      // PASO 3 â†’ CREAR REGISTER
      // ============================================================
      switchMap(({ postulant }) => {
        return this.registerService.create(payloads.register).pipe(
          map((reg: any) => ({ postulant, register: reg }))
        );
      }),

      switchMap(({ postulant, register }) => {
        console.log('ðŸŸ¢ Register creado:', register);

        // ============================================================
        // PASO 4 â†’ MOVIMIENTOS (si existen)
        // ============================================================
        const movementsCalls = payloads.movements.map((mv) => {
          mv.register = this.packRegister(register);
          return this.movementService.create(mv);
        });

        // ============================================================
        // PASO 5 â†’ SUSTANCIAS
        // ============================================================
        const substancesCalls = payloads.substances.map((sb) => {
          sb.register = this.packRegister(register);
          return this.registerSubstanceService.create(sb);
        });

        const allCalls = [...movementsCalls, ...substancesCalls];

        if (allCalls.length === 0) {
          return of({
            postulant,
            register,
            movements: [],
            substances: [],
          });
        }

        return forkJoin(allCalls).pipe(
          map((results) => ({
            postulant,
            register,
            movements: results.filter((x: any) => x?.profession),
            substances: results.filter((x: any) => x?.substance),
          }))
        );
      }),

      catchError((err) => {
        console.error('âŒ Error en SAVE DEMAND:', err);
        return of({ error: err });
      })
    );
  }

  // ================================================================
  // ðŸŸ© ConstrucciÃ³n de Payloads
  // ================================================================
  private buildPayloads(form: any, userId: number, programId: number) {

    // ----------------------------
    // POSTULANT PAYLOAD
    // ----------------------------
    const postulant = {
      user: { id: userId },
      program: { id: programId },
      commune: { id: form.value.commune },
      sex: { id: form.value.sex },
      convPrev: {
        id: form.value.convPrev,
        intPrev: { id: form.value.intPrev },
      },
      firstName: form.value.firstName,
      lastName: form.value.secondName,
      firstLastName: form.value.firstLastName,
      secondLastName: form.value.secondLastName,
      rut: form.value.rut,
      birthdate: formatDate(form.value.birthDate, 'yyyy-MM-dd', 'en-CL'),
      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
    };

    // ----------------------------
    // CONTACT PAYLOAD
    // ----------------------------
    const contact = {
      name: form.value.name,
      description: form.value.description,
      email: form.value.emailPostulant,
      cellphone: form.value.cellphone,
      postulantId: 0,
    };

    // ----------------------------
    // REGISTER PAYLOAD
    // ----------------------------
    const register = {
      postulant: {
        id: 0, // se reemplaza luego
        user: { id: userId },
        commune: { id: form.value.commune },
        sex: { id: form.value.sex },
        convPrev: {
          id: form.value.convPrev,
          intPrev: { id: form.value.intPrev },
        },
      },
      contactType: { id: Number(form.value.contactTypes) },
      sender: { id: Number(form.value.senders) },
      diverter: { id: Number(form.value.diverters) },
      program: { id: programId },
      number_tto: String(form.value.ntrat),
      user: { id: userId },
      notRelevant: { id: Number(form.value.notRelevants) },
      date_attention: new Date().toISOString().split('T')[0],
      description: form.value.observaciones || '',
      result: { id: Number(form.value.result) },
      state: { id: Number(form.value.state) },
      is_history: 'NO',
    };

    // ----------------------------
    // MOVEMENT PAYLOADS (1â€¦4)
    // ----------------------------
    
    const movements: any[] = [];
    for (let i = 1; i <= 4; i++) {
      const prof = form.value[`profession${i}`];
      const name = form.value[`profesional${i}`];
      const date = form.value[`fechaOfrecida${i}`];
      const hour = form.value[`horaOfrecida${i}`];
      const state = form.value[`asistencia${i}`];

      if (!prof || !name || !date || !hour) continue;

      movements.push({
        profession: { id: Number(prof) },
        user: { id: userId },
        full_name: name,
        date_attention: new Date().toISOString().split('T')[0],
        hour_attention: hour,
        state_attention: state || '',
      });
    }
    
    // ----------------------------
    // SUBSTANCES (principal + secundarias)
    // ----------------------------
    const principal = form.value.substance;
    const sec = form.value.secondarySubstances || [];
    const substances: any[] = [];

    if (principal) {
      substances.push({
        substance: { id: Number(principal) },
        level: 'Principal',
      });
    }

    sec.forEach((s: number) => {
      substances.push({
        substance: { id: Number(s) },
        level: 'Secundaria',
      });
    });

    return { postulant, contact, register, movements, substances };
  }

  // ================================================================
  // ðŸŸ§ Empaquetar Register completo
  // ================================================================
  private packRegister(register: any) {
    return {
      id: register.id,
      postulant: register.postulant,
      contactType: register.contactType,
      sender: register.sender,
      diverter: register.diverter,
      program: register.program,
      user: register.user,
      date_attention: register.date_attention,
      description: register.description,
      state: register.state,
      number_tto: register.number_tto,
      is_history: register.is_history,
    };
  }

  // ================================================================
  // ðŸŸ¦ Programa activo
  // ================================================================
  private getActiveProgramObj(): any {
    const active = this.tokenService.getActiveProgram();
    if (!active) return null;

    const programs = JSON.parse(sessionStorage.getItem('programs') || '[]');
    return programs.find((p: any) => p.name === active) || null;
  }
}

