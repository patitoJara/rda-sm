// Run locally: node src/app/views/ui-lab/ui-lab-input.utils.test.cjs
// Uses the repository's existing TypeScript compiler; no browser or new dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, 'ui-lab-input.utils.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const utils = { exports: {} };
new Function('exports', compiled.outputText)(utils.exports);
const u = utils.exports;
let checks = 0;
function equal(actual, expected) { assert.equal(actual, expected); checks++; }

for (const input of ['189035942', '18.903.594-2', '18903594-2']) {
  equal(u.normalizeRut(input), '189035942');
  equal(u.formatRut(input), '18.903.594-2');
  equal(u.validateRut(input), true);
}
equal(u.normalizeRut(' 6-k '), '6K');
equal(u.formatRut('6k'), '6-K');
equal(u.validateRut('6-k'), true);
for (const input of ['', '18.903.594-3', 'abc189035942', '0-0', '123K4', '1890359429']) equal(u.validateRut(input), false);

for (const input of ['05102026', '5/10/2026', '05/10/2026']) {
  equal(u.normalizeDate(input), '05102026');
  equal(u.formatDate(input), '05/10/2026');
  equal(u.validateDate(input), true);
  equal(u.toApiDate(input), '2026-10-05');
}
for (const input of ['31/02/2026', '29/02/2027', '29/02/1900', '00/10/2026', '05/13/2026', '2026-10-05', '', '05/10/26', '01/01/0000', 'x05102026']) {
  equal(u.validateDate(input), false);
  equal(u.toApiDate(input), null);
}
for (const input of ['29/02/2028', '29/02/2000', '31/12/2026']) equal(u.validateDate(input), true);
equal(u.formatDate('31/02/2026'), '31/02/2026');
equal(u.toApiDate('01/01/0001'), '0001-01-01');

for (const [input, expected] of [['1840', '18:40'], ['640', '06:40'], ['930', '09:30'], ['1545', '15:45'], ['18:40', '18:40'], ['6:40', '06:40'], ['2359', '23:59'], ['0005', '00:05']]) {
  equal(u.validateTime(input), true);
  equal(u.formatTime(input), expected);
  equal(u.normalizeTime(input), expected.replace(':', ''));
}
for (const input of ['2365', '2460', '2500', '2400', '24:00', '-640', '6:4', 'abc1840', '18400', '', '64']) equal(u.validateTime(input), false);
equal(u.formatTime('2365'), '2365');
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute++) {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    equal(u.formatTime(h + m), h + ':' + m);
    equal(u.validateTime(h + ':' + m), true);
  }
}
console.log(`PASS: ${checks} assertions, including all 1,440 valid minutes, RUT checksums and Gregorian dates.`);
