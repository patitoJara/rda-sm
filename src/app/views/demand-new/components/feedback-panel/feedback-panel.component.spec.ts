import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FeedbackPanelComponent } from './feedback-panel.component';
import { DemandNewComponent } from '../../demand-new.component';
import { buildFeedbackContext, isMildCommitment } from '../../actions/demand-new-interview.actions';
import { resolveDemandActionMatrix } from '../../utils/demand-new-action-matrix.utils';

const levels = [{code: 'LEVE', name: 'Leve'}, {code: 'MODERADO', name: 'Moderado'}, {code: 'SEVERO', name: 'Severo'}];
const results = ['LISTA_ESPERA', 'INGRESO_TRATAMIENTO', 'ABANDONO', 'REFERENCIA', 'RED_EXTERNA', 'NO_ES_PERFIL']
  .map((code, index) => ({id: index + 1, code, name: code === 'NO_ES_PERFIL' ? 'No es perfil' : code}));

describe('AG-RDA-DEM-CIERRE-004: clasificación, retroalimentación y cierre', () => {
  function matrix(result: any = null) {
    return resolveDemandActionMatrix({episodeClosed: false, stageClosed: false, citationCount: 1,
      pendingCitationCount: 0, firstInterviewCompleted: true, feedbackResults: result ? [result] : [], referenceExecuted: false});
  }

  it('filtra el selector real por Leve y conserva la excepción de Lista de espera', () => {
    const getter = Object.getOwnPropertyDescriptor(DemandNewComponent.prototype, 'availableFeedbackResults')!.get!;
    expect(getter.call({results, demandActionMatrix: matrix(), isMildFeedbackCommitment: true})).toEqual(results);
    expect(getter.call({results, demandActionMatrix: matrix(), isMildFeedbackCommitment: false}).map((r: any) => r.code))
      .not.toContain('NO_ES_PERFIL');
    expect(getter.call({results, demandActionMatrix: matrix('LISTA_ESPERA'), isMildFeedbackCommitment: true}).map((r: any) => r.code))
      .toEqual(['REFERENCIA']);
  });

  it('el selector de cierre usa el ID del catálogo y ofrece solo No es perfil', () => {
    const getter = Object.getOwnPropertyDescriptor(DemandNewComponent.prototype, 'availableClosureReasons')!.get!;
    const closureReasons = [{id: 4, code: 'NO_ES_PERFIL', name: 'No es perfil'},
      {id: 1, code: 'INGRESO_TRATAMIENTO', name: 'Ingreso a tratamiento'},
      {id: 2, code: 'ABANDONO', name: 'Abandono'}, {id: 9, code: 'OTRO_CIERRE', name: 'Otro cierre'}];
    expect(getter.call({closureReasons, demandActionMatrix: matrix('NO_ES_PERFIL')})).toEqual([closureReasons[0]]);
    expect(getter.call({closureReasons, demandActionMatrix: matrix('LISTA_ESPERA')}).map((r: any) => r.code))
      .toEqual(['ABANDONO', 'INGRESO_TRATAMIENTO']);
    expect(getter.call({closureReasons: [], demandActionMatrix: matrix('NO_ES_PERFIL')})).toEqual([]);
  });

  it('valida el payload sin cambiar códigos ni contratos y rechaza otros niveles', () => {
    for (const code of ['LEVE', 'MODERADO', 'SEVERO', '', 'DESCONOCIDO']) {
      const context = buildFeedbackContext({raw: {eventDate: new Date(2026, 10, 16), eventHour: '10:30',
        programProfessionalId: 1, biopsychosocialCommitmentCode: code, resultCode: 'NO_ES_PERFIL'},
        programId: 7, longitudinal: {stages: [{id: 10, programId: 7, stageOrder: 1}]}, commitmentLevels: levels});
      expect(context.valid).withContext(code).toBe(code === 'LEVE');
      if (context.valid) {
        expect(context.payload.resultCode).toBe('NO_ES_PERFIL');
        expect(context.payload.biopsychosocialCommitmentCode).toBe('LEVE');
        expect(context.payload.eventTypeCode).toBe('RETROALIMENTACION');
        expect(context.payload.stageId).toBe(10);
      }
    }
    expect(isMildCommitment('LEVE', [])).toBeFalse();
    expect(isMildCommitment('1', [{code: '1', name: 'Leve'}])).toBeTrue();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [FeedbackPanelComponent], providers: [provideNoopAnimations()]}).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(FeedbackPanelComponent);
    fixture.componentInstance.form = new FormGroup({
      eventDate: new FormControl(null), eventHour: new FormControl(''), programProfessionalId: new FormControl(null),
      biopsychosocialCommitmentCode: new FormControl('LEVE'), resultCode: new FormControl('NO_ES_PERFIL'),
    });
    fixture.componentInstance.commitmentLevels = levels;
    fixture.componentInstance.results = results;
    fixture.detectChanges();
    return fixture;
  }

  it('muestra la nota solo con Leve dentro del campo y aclara que el cierre es posterior', () => {
    const fixture = render();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.feedback-field--commitment mat-hint')?.textContent?.trim())
      .toBe('Leve: habilita “No es perfil” en Retroalimentación.');
    expect(fixture.componentInstance.selectedResultHelp.message).toContain('posteriormente');
    for (const code of ['MODERADO', 'SEVERO', '']) {
      fixture.componentInstance.form.get('biopsychosocialCommitmentCode')!.setValue(code);
      fixture.detectChanges();
      expect(host.querySelector('.feedback-mild-note')).toBeNull();
    }
  });

  for (const width of [1440, 390]) {
    it(`renderiza la nota sin desbordes ni superposición a ${width}px`, async () => {
      const fixture = render();
      const frame = document.createElement('iframe');
      frame.style.width = `${width}px`;
      frame.style.height = '1600px';
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        doc.head.innerHTML = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('');
        doc.body.style.margin = '0';
        doc.body.innerHTML = fixture.nativeElement.outerHTML;
        await new Promise(resolve => setTimeout(resolve, 150));
        const note = doc.querySelector('.feedback-mild-note')!.getBoundingClientRect();
        const selector = doc.querySelector('.feedback-field--commitment mat-select')!.getBoundingClientRect();
        const result = doc.querySelector('.feedback-field--result')!.getBoundingClientRect();
        expect(note.height).toBeGreaterThan(0);
        expect(note.top).toBeGreaterThanOrEqual(selector.bottom);
        expect(note.right).toBeLessThanOrEqual(width);
        expect(note.left).toBeGreaterThanOrEqual(0);
        const overlaps = note.left < result.right && note.right > result.left && note.top < result.bottom && note.bottom > result.top;
        expect(overlaps).toBeFalse();
        expect(doc.body.scrollWidth).toBeLessThanOrEqual(width);
      } finally { frame.remove(); }
    });
  }
});
