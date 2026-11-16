// Synthetic fixtures only. Run with node --test program-analysis-report.test.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(name, mocks = {}) {
  const filename = path.join(__dirname, name + '.ts');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  const original = compiled.require.bind(compiled);
  compiled.require = name => name in mocks ? mocks[name] : original(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText, filename);
  return compiled.exports;
}
const report = load('program-analysis-report');
const data = load('program-analysis-data');
const { ProgramAnalysisDialogComponent } = load('program-analysis-dialog.component', {
  '@angular/core': { Component: () => target => target },
  '@angular/common': {}, '@angular/common/http': {}, '@angular/forms': {},
  '@angular/material/button': {}, '@angular/material/dialog': {}, '@angular/material/icon': {},
  '@angular/material/progress-spinner': {}, '@angular/material/tooltip': {},
  '@angular/core/rxjs-interop': { takeUntilDestroyed: () => source => source },
  './program-analysis-report': report, './program-analysis-data': data,
  '../../../core/services/demand.service': {},
  '../services/inicio-active-metrics.service': {},
});
function fixture(selected = 0) {
  // Test actual prototype methods without starting Angular, HTTP or a browser session.
  const component = Object.create(ProgramAnalysisDialogComponent.prototype);
  component.allPrograms = Array.from({ length: 9 }, (_, i) => ({
    programId: i + 1, programName: `Programa de prueba ${i + 1}`,
    activeDemands: i === 8 ? 0 : i + 1, redCases: i % 2, averageAccumulatedDays: 15.5,
    withoutFirstCitation: 2, withoutFeedback: 3, pendingActions: 7,
    severeCommitmentCases: 1, pendingReferences: 1, pendingClosures: 1, openAlerts: 0,
  }));
  component.programId = selected;
  component.year = 2026;
  component.month = 3;
  component.months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  component.updatedAt = new Date('2026-10-20T12:00:00-03:00');
  component.isFuture = month => month > 10;
  component.referencesLoading = false;
  component.referenceLoadError = null;
  component.periodReferences = component.allPrograms.map(p => ({
    programId: p.programId, receivedReferences: 1, sentReferences: 2, pendingReferences: 0, referenceBalance: -1,
  }));
  component.activeLoadedProgramId = selected;
  component.activeMetrics = { waitingList: 4, averageWaitingDays: 11.2, averageProgramDays: 7.1 };
  component.history = {
    entriesComplete: true, closuresComplete: true, stageClosuresComplete: true,
    entered: [{ episodeId: 1, programId: 1, year: 2026, month: 2, result: '' }],
    closed: [{ episodeId: 1, programId: 2, year: 2026, month: 3, result: 'INGRESO_TRATAMIENTO' }],
    closedStages: [
      { stageId: 1, episodeId: 1, programId: 1, year: 2026, month: 3, result: 'REFERENCIA' },
      { stageId: 2, episodeId: 1, programId: 2, year: 2026, month: 3, result: 'INGRESO_TRATAMIENTO' },
      { stageId: 3, episodeId: 2, programId: 1, year: 2026, month: 3, result: 'OTRA_CAUSAL' },
    ],
  };
  global.window = { location: { origin: 'http://localhost:4201' } };
  return component;
}
const metric = (list, label) => list.find(m => m.label === label)?.value;

test('All programs produce summary plus nine sheets, including zero active programs', () => {
  const snapshot = fixture().createReportSnapshot();
  const html = report.buildExecutiveReport(snapshot);
  assert.equal(snapshot.programs.length, 9);
  assert.equal((html.match(/data-report-sheet=/g) || []).length, 10);
  assert.equal(snapshot.programs[8].active, 0);
  assert.match(html, /size: Letter portrait/);
  assert.match(html, /counter\(page\)/);
});
test('A selected program prints only its own sheet and no consolidated summary', () => {
  const snapshot = fixture(2).createReportSnapshot();
  const html = report.buildExecutiveReport(snapshot);
  assert.equal(snapshot.programs.length, 1);
  assert.equal(snapshot.programs[0].id, 2);
  assert.equal((html.match(/data-report-sheet=/g) || []).length, 1);
  assert.doesNotMatch(html, /data-report-sheet="summary"/);
});
test('Snapshot respects monthly filters while retaining annual context and closure units', () => {
  const component = fixture();
  const snapshot = component.createReportSnapshot();
  const first = snapshot.programs[0], second = snapshot.programs[1];
  assert.equal(first.entered, component.count('entered', 1));
  assert.equal(first.entered, 0);
  assert.equal(first.annualEntered, 1);
  assert.equal(first.closed, 0);
  assert.equal(second.closed, 1);
  assert.equal(metric(first.results, 'Referencia'), 1);
  assert.equal(metric(first.results, 'Otras causales'), 1);
  assert.equal(metric(snapshot.summary, 'Etapas de gestión cerradas'), component.closedStageCount);
  assert.equal(first.monthly.length, 12);
  assert.equal(first.monthly[2].selected, true);
  assert.equal(first.monthly[10].future, true);
});
test('Global supplemental metrics are never assigned to individual program sheets', () => {
  const general = fixture().createReportSnapshot();
  assert.equal(metric(general.programs[0].operational, 'Lista de espera'), undefined);
  assert.equal(metric(general.programs[0].operational, 'Promedio días por programa'), undefined);
  const selected = fixture(1).createReportSnapshot();
  assert.equal(metric(selected.programs[0].operational, 'Lista de espera'), 4);
  assert.equal(metric(selected.programs[0].operational, 'Promedio días por programa'), 7.1);
});
test('Unavailable history, classifications and references remain unavailable, never zero', () => {
  const component = fixture(1);
  component.history.stageClosuresComplete = false;
  component.history.entriesComplete = false;
  component.periodReferences = [];
  const p = component.createReportSnapshot().programs[0];
  assert.equal(p.entered, '—');
  assert.equal(metric(p.results, 'Otras causales'), null);
  assert.equal(metric(p.references, 'Enviadas'), undefined);
  assert.match(report.buildExecutiveReport(component.createReportSnapshot()), /<dd>—<\/dd>/);
});
test('Text is escaped and no supervision recommendations enter the report', () => {
  const component = fixture(1);
  component.allPrograms[0].programName = 'Programa <script>alert(1)</script> & Ñandú';
  component.allPrograms[0].suggestedAction = 'RECOMENDACIÓN NO PERMITIDA';
  const html = report.buildExecutiveReport(component.createReportSnapshot());
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Ñandú/);
  assert.doesNotMatch(html, /<script>|RECOMENDACIÓN NO PERMITIDA/);
  assert.match(html, /no constituye una evaluación de desempeño/);
});
test('Print action uses the generator, not a DOM clone or additional service calls', () => {
  const component = fixture(1);
  component.loading = false;
  component.demandService = new Proxy({}, { get() { throw new Error('Unexpected HTTP request'); } });
  let result;
  component.printReportHtml = html => { result = html; };
  component.printAnalysis();
  assert.match(result, /Ficha de programa/);
  assert.doesNotMatch(result, /landscape|dashboard-body/);
});
test('Print action does not publish an in-flight historical snapshot', () => {
  const component = fixture(1);
  component.history = null;
  component.historyError = null;
  component.printReportHtml = () => { throw new Error('Printed before history completed'); };
  component.printAnalysis();
});

test('Consolidated totals match program sheets without equating referral stages and sent movements', () => {
  const component = fixture();
  const snapshot = component.createReportSnapshot();
  for (const [label, field] of [
    ['Demandas activas · actuales', 'active'], ['Casos críticos · rojos actuales', 'red'],
    ['Demandas ingresadas · período', 'entered'], ['Cierres definitivos · período', 'closed'],
  ]) {
    assert.equal(metric(snapshot.summary, label), snapshot.programs.reduce((sum, p) => sum + p[field], 0));
  }
  for (const [label, field] of [['Referencias enviadas · período', 'Enviadas'], ['Referencias recibidas · período', 'Recibidas']]) {
    assert.equal(metric(snapshot.summary, label), snapshot.programs.reduce((sum, p) => sum + metric(p.references, field), 0));
  }
  assert.equal(metric(snapshot.summary, 'Etapas de gestión cerradas'), snapshot.programs.reduce((sum, p) => sum + metric(p.results, 'Total de etapas cerradas'), 0));
  for (const p of snapshot.programs) {
    const single = fixture(p.id).createReportSnapshot().programs[0];
    for (const field of ['active', 'entered', 'closed', 'red', 'results', 'references', 'monthly']) assert.deepEqual(single[field], p[field]);
  }
  assert.equal(metric(snapshot.programs[0].results, 'Referencia'), 1);
  assert.equal(metric(snapshot.programs[0].references, 'Enviadas'), 2);
});

test('Complete nine-program scope preserves API rows and includes the program with no active demands', () => {
  const component = fixture();
  const original = Object.freeze(component.periodReferences.map(row => Object.freeze(row)));
  component.periodReferences = original;
  assert.equal(component.referencesError, null);
  assert.equal(component.referenceCoverage, true);
  assert.equal(component.references.length, 9);
  assert.equal(component.referenceTotal('sentReferences'), 18);
  component.programId = 9;
  assert.equal(component.programs[0].activeDemands, 0);
  assert.equal(component.references.length, 1);
  assert.equal(component.referenceTotal('sentReferences'), 2);
  assert.equal(metric(component.createReportSnapshot().programs[0].references, 'Enviadas'), 2);
  assert.strictEqual(component.periodReferences, original);
});

for (const [name, change, warning] of [
  ['additional program', rows => [...rows, { ...rows[0], programId: 999 }], /fuera del ámbito/],
  ['missing expected program', rows => rows.filter(row => row.programId !== 9), /sin información/],
  ['duplicate program', rows => [...rows, { ...rows[8] }], /duplicados/],
]) {
  test(`Invalid reference scope (${name}) blocks consolidated and individual figures without mutating API data`, () => {
    const component = fixture();
    const original = Object.freeze(change(component.periodReferences).map(row => Object.freeze(row)));
    component.periodReferences = original;
    for (const selected of [0, 1, 9]) {
      component.programId = selected;
      assert.match(component.referencesError, warning);
      assert.equal(component.referenceCoverage, false);
      assert.deepEqual(component.references, []);
      for (const field of ['sentReferences', 'receivedReferences', 'pendingReferences', 'referenceBalance']) {
        assert.equal(component.referenceTotal(field), '—');
      }
      const snapshot = component.createReportSnapshot();
      assert.equal(metric(snapshot.summary, 'Referencias enviadas · período'), '—');
      assert.equal(metric(snapshot.summary, 'Referencias recibidas · período'), '—');
      for (const program of snapshot.programs) assert.ok(program.references.every(m => m.value === undefined));
      assert.match(report.buildExecutiveReport(snapshot), /<dd>—<\/dd>/);
      // Stage results remain independent of the references response.
      if (selected === 1) assert.equal(metric(snapshot.programs[0].results, 'Referencia'), 1);
      assert.strictEqual(component.periodReferences, original);
    }
  });
}

test('Period changes clear stale figures, ignore late responses and recover from invalid coverage and HTTP errors', () => {
  const { Subject } = require('rxjs');
  const component = fixture();
  const valid = component.periodReferences;
  const requests = [];
  component.referenceRequest = 0;
  component.loadActiveMetrics = () => {};
  component.demandService = { getSupervisorProgramsReferences(from, to) {
    const response = new Subject();
    requests.push({ from, to, response });
    return response;
  } };
  component.selectMonth(2);
  assert.deepEqual([requests[0].from, requests[0].to], ['2026-02-01', '2026-02-28']);
  assert.equal(component.referenceTotal('sentReferences'), '—');
  assert.deepEqual(component.references, []);
  assert.ok(component.createReportSnapshot().programs.every(p => p.references.every(m => m.value === undefined)));
  component.selectMonth(3);
  requests[1].response.next([...valid, { ...valid[0], programId: 999 }]);
  requests[0].response.next(valid);
  assert.match(component.referencesError, /fuera del ámbito/);
  assert.equal(component.referenceTotal('sentReferences'), '—');
  component.selectMonth(4, 9);
  requests[2].response.next(valid);
  assert.equal(component.referencesError, null);
  assert.equal(component.referenceTotal('sentReferences'), 2);
  component.selectMonth(5);
  requests[3].response.error(new Error('Synthetic HTTP failure'));
  assert.match(component.referencesError, /No fue posible/);
  assert.equal(component.referenceTotal('sentReferences'), '—');
  component.year = 2027;
  component.selectMonth(0, 0);
  assert.deepEqual([requests[4].from, requests[4].to], ['2027-01-01', '2027-12-31']);
  requests[4].response.next(valid);
  assert.equal(component.referencesError, null);
  assert.equal(component.referenceTotal('sentReferences'), 18);
  assert.strictEqual(component.periodReferences, valid);
});

test('Printed regression: two-line predominant result keeps institutional note on each program page', {
  skip: !process.env.REPORT_PRINT_QA,
}, () => {
  const { execFileSync } = require('node:child_process');
  const target = path.resolve(process.env.REPORT_QA_DIR);
  const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  for (const [scenario, expected] of [['consolidado', 10], ['individual', 1], ['regresion-consolidado', 10], ['regresion-individual', 1], ['extenso', 2]]) {
    const pdf = path.join(target, scenario + '.pdf');
    execFileSync(chrome, [
      '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-pdf-header-footer',
      '--user-data-dir=' + path.join(target, 'profile-' + scenario),
      '--print-to-pdf=' + pdf, require('node:url').pathToFileURL(path.join(target, scenario + '.html')).href,
    ], { timeout: 60000, stdio: 'pipe' });
    const info = JSON.parse(execFileSync('python', ['-c', `
import pymupdf as fitz, json, sys
doc=fitz.open(sys.argv[1])
texts=[p.get_text() for p in doc]
print(json.dumps(dict(pages=len(doc), letter=all(p.rect.width==612 and p.rect.height==792 for p in doc), notes=[t.count('no constituye una') for t in texts], replacements=sum(t.count(chr(65533)) for t in texts))))
`, pdf], { encoding: 'utf8' }));
    assert.equal(info.pages, expected, scenario);
    assert.equal(info.letter, true);
    assert.equal(info.replacements, 0);
    if (scenario !== 'extenso') assert.deepEqual(info.notes, Array(expected).fill(1), scenario + ': detached note');
    else assert.equal(info.notes.reduce((a, b) => a + b), 1);
  }
});

// Optional QA artifacts are explicitly synthetic and stay outside production assets.
if (process.env.REPORT_QA_DIR) {
  const target = path.resolve(process.env.REPORT_QA_DIR);
  fs.mkdirSync(target, { recursive: true });
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.resolve('src/assets/logoSSM.png')).toString('base64');
  for (const scenario of ['consolidado', 'individual', 'extenso', 'regresion-consolidado', 'regresion-individual']) {
    const component = fixture(scenario.endsWith('consolidado') ? 0 : scenario === 'regresion-individual' ? 8 : 1);
    if (scenario === 'extenso') {
      component.allPrograms[0].programName = 'Programa de prueba con nombre extenso de atención y continuidad comunitaria para personas adultas de la Región de Magallanes y Antártica Chilena';
      component.history.closedStages[0].result = 'CAUSAL DE PRUEBA CON DESCRIPCIÓN EXTENSA '.repeat(12);
    }
    const snapshot = component.createReportSnapshot();
    if (scenario.startsWith('regresion')) {
      const program = snapshot.programs.find(p => p.id === 8);
      program.name = 'PAI Adolescente Punta Arenas';
      program.results.find(m => m.label === 'Resultado predominante').value = 'Abandono / Ingreso a tratamiento';
    }
    snapshot.logoUrl = logo;
    snapshot.emittedAt = '20-10-2026, 12:00 (DATOS SINTÉTICOS DE PRUEBA)';
    fs.writeFileSync(path.join(target, scenario + '.html'), report.buildExecutiveReport(snapshot), 'utf8');
  }
}
