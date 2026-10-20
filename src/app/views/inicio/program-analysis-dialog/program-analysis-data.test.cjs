// Run with node --test src/app/views/inicio/program-analysis-dialog/program-analysis-data.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { of, firstValueFrom } = require('rxjs');
const filename = path.join(__dirname, 'program-analysis-data.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { dateParts, buildHistory, completePages, loadHistory, stageResults } = compiled.exports;
const episode = { episodeId: 1, originalRequestDate: '2025-12-31', stateCode: 'CERRADO', closureDate: '2026-03-01', currentProgram: { id: 2 }, resultCode: 'OTRO_RESULTADO' };
const stages = [{ episodeId: 1, stageOrder: 1, programId: 1 }, { episodeId: 1, stageOrder: 2, programId: 2 }];

test('Uses functional dates across years and preserves origin/destination programs', () => {
  const data = buildHistory([episode], stages);
  assert.equal(data.entered[0].year, 2025);
  assert.equal(data.entered[0].programId, 1);
  assert.equal(data.closed[0].month, 3);
  assert.equal(data.closed[0].programId, 2);
  assert.equal(data.closed[0].result, 'OTRO_RESULTADO');
  assert.equal(data.closed.length, 1);
});
test('Missing functional dates do not fall back to technical timestamps', () => {
  const data = buildHistory([{ ...episode, closureDate: null, originalRequestDate: '', createdAt: '2026-01-01' }], stages);
  assert.equal(data.entriesComplete, false);
  assert.equal(data.closuresComplete, false);
});
test('Missing or ambiguous first stage makes income unavailable', () => {
  assert.equal(buildHistory([episode], []).entriesComplete, false);
  assert.equal(buildHistory([episode], [stages[0], stages[0]]).entriesComplete, false);
});
test('Open episodes are not counted as effective closures', () => {
  assert.equal(buildHistory([{ ...episode, stateCode: 'EN_TRAMITE' }], stages).closed.length, 0);
});
test('Duplicate episodes are rejected', () => assert.throws(() => buildHistory([episode, episode], stages)));
test('Calendar dates are validated without timezone month shifts', () => {
  assert.equal(dateParts('2026-02-30'), null);
  assert.deepEqual(dateParts('2026-03-01T00:00:00Z'), { year: 2026, month: 3 });
});
test('All pages are collected before exposing totals', async () => {
  const visited = [];
  const items = await firstValueFrom(completePages(page => {
    visited.push(page);
    return of({ number: page, totalPages: 2, totalElements: 2, content: [page] });
  }));
  assert.deepEqual(visited, [0, 1]);
  assert.deepEqual(items, [0, 1]);
});
test('Partial, changing, repeated or oversized pagination fails closed', async () => {
  for (const load of [
    () => of({ number: 0, totalPages: 1, totalElements: 2, content: [1] }),
    page => of({ number: page, totalPages: 2, totalElements: page ? 3 : 2, content: [page] }),
    () => of({ number: 0, totalPages: 2, totalElements: 2, content: [1] }),
    () => of({ number: 0, totalPages: 101, totalElements: 10001, content: [] }),
  ]) await assert.rejects(firstValueFrom(completePages(load)));
});
test('Empty complete result is a genuine zero', async () => {
  assert.deepEqual(await firstValueFrom(completePages(() => of({ number: 0, totalPages: 0, totalElements: 0, content: [] }))), []);
  assert.equal(buildHistory([], []).entriesComplete, true);
});

function sourceWithImplicitActiveDefault({ omitClosed = false, ignoreState = false } = {}) {
  const requests = [];
  const active = { ...episode, episodeId: 10, stateCode: 'EN_TRAMITE', originalRequestDate: '2026-01-02', closureDate: null };
  const closed = { ...episode, originalRequestDate: '2026-02-10' };
  const rows = [
    { episodeId: 10, stageId: 10, stageOrder: 1, programId: 1, stageStateCode: 'EN_TRAMITE' },
    { episodeId: 1, stageId: 11, stageOrder: 1, programId: 1, stageStateCode: 'CERRADO', stageResultCode: 'REFERENCIA' },
    { episodeId: 1, stageId: 12, stageOrder: 2, programId: 2, stageStateCode: 'CERRADO', stageResultCode: 'OTRO_RESULTADO' },
  ];
  const page = (content, query) => of({ content: content.slice(query.page, query.page + 1), number: query.page, totalElements: content.length, totalPages: content.length });
  return {
    requests,
    getPrioritizedEpisodes(query) {
      requests.push({ type: 'episodes', ...query });
      const state = ignoreState ? 'EN_TRAMITE' : query.stateCode || 'EN_TRAMITE';
      return page(state === 'CERRADO' ? (omitClosed ? [] : [closed]) : [active], query);
    },
    getPrioritizedEpisodeStages(query) {
      requests.push({ type: 'stages', ...query });
      return page(rows.filter(row => row.stageStateCode === query.stateCode), query);
    },
  };
}

test('Regression: implicit active-only default must not omit closed episodes from income or closures', async () => {
  const source = sourceWithImplicitActiveDefault();
  const data = await firstValueFrom(loadHistory(source));
  assert.equal(data.entered.filter(m => m.year === 2026).length, 2);
  assert.equal(data.closed.filter(m => m.year === 2026).length, 1);
  assert.equal(data.entered.find(m => m.episodeId === 1).programId, 1);
  assert.equal(data.closed[0].programId, 2);
  assert.equal(data.closed[0].month, 3);
  assert.ok(source.requests.every(q => ['EN_TRAMITE', 'CERRADO'].includes(q.stateCode)));
  assert.ok(source.requests.some(q => q.type === 'stages' && q.stateCode === 'CERRADO' && q.page === 1));
});

test('Closed reference stages do not multiply unique episode closures', async () => {
  const data = await firstValueFrom(loadHistory(sourceWithImplicitActiveDefault()));
  assert.equal(data.closed.length, 1);
  assert.notEqual(data.closed[0].result, 'REFERENCIA');
});

test('An endpoint ignoring the requested state cannot publish a false zero', async () => {
  await assert.rejects(firstValueFrom(loadHistory(sourceWithImplicitActiveDefault({ ignoreState: true }))), /estado solicitado/);
});

test('Closed stages absent from the episode source invalidate coverage rather than reporting zero', async () => {
  await assert.rejects(firstValueFrom(loadHistory(sourceWithImplicitActiveDefault({ omitClosed: true }))), /no aparecen/);
});

test('Pagination state is isolated per subscription', async () => {
  const stream = completePages(() => of({ number: 0, totalPages: 1, totalElements: 1, content: [1] }));
  assert.deepEqual(await firstValueFrom(stream), [1]);
  assert.deepEqual(await firstValueFrom(stream), [1]);
});

test('An active referred episode contributes one income and no final closure', async () => {
  const active = { ...episode, stateCode: 'EN_TRAMITE', closureDate: null, originalRequestDate: '2026-01-10' };
  const stageRows = [
    { episodeId: 1, stageId: 1, stageOrder: 1, programId: 1, stageStateCode: 'CERRADO', stageResultCode: 'REFERENCIA', closureDate: '2026-02-10' },
    { episodeId: 1, stageId: 2, stageOrder: 2, programId: 2, stageStateCode: 'EN_TRAMITE' },
  ];
  const page = content => of({ content, number: 0, totalPages: content.length ? 1 : 0, totalElements: content.length });
  const history = await firstValueFrom(loadHistory({
    getPrioritizedEpisodes: q => page(q.stateCode === 'EN_TRAMITE' ? [active] : []),
    getPrioritizedEpisodeStages: q => page(stageRows.filter(s => s.stageStateCode === q.stateCode)),
  }));
  assert.equal(history.entered.length, 1);
  assert.equal(history.entered[0].programId, 1);
  assert.equal(history.closed.length, 0);
  assert.equal(history.closuresComplete, true);
  assert.equal(stageResults(history, 2026, 2, 1).count('REFERENCIA'), 1);
  assert.equal(stageResults(history, 2026, 2, 2).count('REFERENCIA'), 0);
});

const trajectory = [
  { episodeId: 1, stageId: 101, stageOrder: 1, programId: 1, stageStateCode: 'CERRADO', stageResultCode: 'REFERENCIA', closureDate: '2026-02-10' },
  { episodeId: 1, stageId: 102, stageOrder: 2, programId: 2, stageStateCode: 'CERRADO', stageResultCode: 'REFERENCIA', closureDate: '2026-03-10' },
  { episodeId: 1, stageId: 103, stageOrder: 3, programId: 3, stageStateCode: 'CERRADO', stageResultCode: 'INGRESO_TRATAMIENTO', closureDate: '2026-04-10' },
];

test('Two referrals and a final closure are three stages, one income and one definitive closure', () => {
  const history = buildHistory([{ ...episode, originalRequestDate: '2026-01-10', closureDate: '2026-04-10', currentProgram: { id: 3 }, resultCode: 'INGRESO_TRATAMIENTO' }], trajectory);
  assert.equal(history.entered.length, 1);
  assert.equal(history.entered[0].programId, 1);
  assert.equal(history.closed.length, 1);
  assert.equal(history.closed[0].programId, 3);
  assert.equal(history.closed[0].month, 4);
  assert.equal(stageResults(history, 2026).total, 3);
  assert.equal(stageResults(history, 2026).count('REFERENCIA'), 2);
  assert.equal(stageResults(history, 2026).count('INGRESO_TRATAMIENTO'), 1);
});

test('Year, month and origin program jointly filter stage results using stage closure dates', () => {
  const history = buildHistory([episode], trajectory);
  assert.equal(stageResults(history, 2026, 2, 1).count('REFERENCIA'), 1);
  assert.equal(stageResults(history, 2026, 3, 1).count('REFERENCIA'), 0);
  assert.equal(stageResults(history, 2026, 3, 2).count('REFERENCIA'), 1);
  assert.equal(stageResults(history, 2025, 2, 1).total, 0);
  assert.equal(stageResults(history, 2026, 0, 0, [1, 2]).total, 2);
  assert.equal(history.closed[0].month, 3); // Episode closure remains independent of stage dates.
  assert.equal(history.entered[0].year, 2025); // Annual matrix income is not stage reception.
});

test('Unrecognized results remain actual categories and participate in predominance', () => {
  const history = buildHistory([episode], [{ ...trajectory[0], stageResultCode: 'OTRA_CAUSAL_REAL' }]);
  const summary = stageResults(history, 2026);
  assert.equal(summary.total, 1);
  assert.equal(summary.count('OTRA_CAUSAL_REAL'), 1);
  assert.deepEqual(summary.predominant, ['OTRA_CAUSAL_REAL']);
});

test('Missing result never masquerades as zero references; total stages still known', () => {
  const history = buildHistory([episode], [{ ...trajectory[0], stageResultCode: null }]);
  assert.equal(stageResults(history, 2026).total, 1);
  assert.equal(stageResults(history, 2026).count('REFERENCIA'), null);
  assert.equal(stageResults(history, 2026).predominant, null);
});

test('Missing stage date cannot fall back to episode closure or closedAt', () => {
  const history = buildHistory([episode], [{ ...trajectory[0], closureDate: null, closedAt: '2026-02-10' }]);
  assert.equal(history.stageClosuresComplete, false);
  assert.equal(stageResults(history, 2026).total, null);
  assert.equal(history.closuresComplete, true);
});

test('Repeated closed stage IDs are rejected, not counted twice', () => {
  assert.throws(() => buildHistory([episode], [trajectory[0], trajectory[0]]), /duplicadas/);
});
