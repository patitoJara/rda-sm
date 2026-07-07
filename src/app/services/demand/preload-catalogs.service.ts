import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Servicios de catálogos
import { CommuneService } from '../comunes.service';
import { SexService } from '../sex.service';
import { ContactTypeService } from '../contact.type.service';
import { SenderService } from '../sender.service';
import { DiverterService } from '../diverter.service';
import { ProgramService } from '../program.service';
import { NotRelevantService } from '../not-relevant.service';
import { SubstanceService } from '../substance.service';
import { ProfessionService } from '../profession.service';
import { ResultService } from '../result.service';
import { StateService } from '../state.service';
import { ConvPrevService } from '../conv-prev.service';
import { IntPrevService } from '../int-prev.service';

@Injectable({
  providedIn: 'root',
})
export class PreloadCatalogsService {
  private communeService = inject(CommuneService);
  private sexService = inject(SexService);
  private contactTypeService = inject(ContactTypeService);
  private senderService = inject(SenderService);
  private diverterService = inject(DiverterService);
  private programService = inject(ProgramService);
  private notRelevantService = inject(NotRelevantService);
  private substanceService = inject(SubstanceService);
  private professionService = inject(ProfessionService);
  private resultService = inject(ResultService);
  private stateService = inject(StateService);
  private convPrevService = inject(ConvPrevService);
  private intPrevService = inject(IntPrevService);

  /**
   * 🟦 PRELOAD DE TODOS LOS CATÁLOGOS USADOS EN DEMAND
   * Devuelve un solo Observable con todos los datos
   */
  loadAll(): Observable<any> {
    return forkJoin({
      communes: this.communeService.listAll().pipe(catchError(() => of([]))),
      sexes: this.sexService.listAll().pipe(catchError(() => of([]))),

      contactTypes: this.contactTypeService
        .listAll()
        .pipe(catchError(() => of([]))),

      senders: this.senderService.listAll().pipe(catchError(() => of([]))),
      diverters: this.diverterService.listAll().pipe(catchError(() => of([]))),

      programs: this.programService.listAll().pipe(catchError(() => of([]))),

      notRelevants: this.notRelevantService
        .listAll()
        .pipe(catchError(() => of([]))),

      substances: this.substanceService
        .listAll()
        .pipe(catchError(() => of([]))),

      convPrev: this.convPrevService.getAll().pipe(catchError(() => of([]))),
      intPrev: this.intPrevService.getAll().pipe(catchError(() => of([]))),

      professions: this.professionService
        .listAll()
        .pipe(catchError(() => of([]))),

      results: this.resultService.listAll().pipe(catchError(() => of([]))),
      state: this.stateService.listAll().pipe(catchError(() => of([]))),
    });
  }
}
