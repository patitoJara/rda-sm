// Local design calculations, using only the already installed TypeScript compiler.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'ui-lab-planner.utils.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const api = {};
new Function('exports', compiled.outputText)(api);
const widths = [158, 145, 290, 290];
const fields = widths.map((width, i) => ({label: String(i), content: width - 22, padding: 20, border: 2, icon: 0, minimum: 100, value: ''}));
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
const desktop = api.planRows(fields, 1040, 12);
equal(desktop.total, 919);
equal(desktop.remaining, 121);
equal(desktop.fits, true);
equal(desktop.rows.map(row => row.length), [4]);
const tablet = api.planRows(fields, 640, 12);
equal(tablet.rows.map(row => row.length), [3, 1]);
equal(tablet.remaining, -279);
equal(tablet.fits, false);
equal(api.planRows(fields, 320, 12).rows.map(row => row.length), [2, 1, 1]);
equal(api.planRows(fields, 919, 12).fits, true);
equal(api.planRows(fields, 918, 12).fits, false);
equal(api.fieldWidth({...fields[0], minimum: 200}), 200);
equal(api.fieldWidth({...fields[0], icon: 24}), 182);
equal(api.planRows(fields, 80, 12).tooNarrow, true);
equal(api.planRows([], 320, 12).total, 0);
equal(api.planRows([], 320, 12).rows, []);
// Exterior width is not usable width: 24px padding + 2px border.
equal(api.planRows(fields, 320 - 26, 12).rows.map(row => row.length), [1, 1, 1, 1]);
equal(api.planRows(fields, 340 - 26, 12).rows.map(row => row.length), [1, 1, 1, 1]);
equal(api.planRows(fields, 341 - 26, 12).rows.map(row => row.length), [2, 1, 1]);
equal(api.planRows(fields, 1040 - 26, 12).remaining, 95);
// Across the usable range, preserve order and never pack a row beyond available width.
for (let available = 290; available <= 1100; available++) {
  const plan = api.planRows(fields, available, 12);
  equal(plan.rows.flat().map(field => field.label), ['0', '1', '2', '3']);
  equal(plan.rows.every(row => row.reduce((sum, field) => sum + api.fieldWidth(field), 0) + (row.length - 1) * 12 <= available), true);
}
console.log(`PASS: ${checks} planner assertions (desktop, tablet, mobile, boundaries and field order).`);
