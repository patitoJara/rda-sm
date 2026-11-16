// Run with Node. Pure local behavior: no server, browser, persistence or new dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
  const api = {}; new Function('exports', compiled.outputText)(api); return api;
}
const {makeLabRecords, queryLabRecords} = load('ui-lab-crud.utils.ts');
const {positionLabPopover, balancedKpiColumns} = load('ui-lab-overlay.utils.ts');
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
const records = makeLabRecords();
const before = JSON.stringify(records);
const defaults = {search: '', state: '', program: '', sortKey: '', direction: '', page: 1, pageSize: 10};
const query = overrides => queryLabRecords(records, {...defaults, ...overrides});
equal(query({}).total, 48);
equal([query({}).start, query({}).end, query({}).pages], [1,10,5]);
equal(query({page: 99}).page, 5);
equal(query({page: 5}).rows.length, 8);
equal(query({page: -2}).page, 1);
equal(query({search: 'LAB-048'}).rows[0].id, 48);
equal(query({search: '123456785'}).total, 48);
equal(query({search: 'no existe'}).total, 0);
equal(query({search: 'no existe'}).start, 0);
equal(query({state: 'Activo'}).total, 16);
equal(query({state: 'Activo', program: 'Programa Sur'}).total, 0);
equal(query({sortKey: 'code', direction: 'desc'}).rows[0].code, 'LAB-048');
equal(query({sortKey: 'date', direction: 'asc'}).rows[0].date, '2026-10-01');
equal(query({sortKey: 'count', direction: 'desc'}).rows[0].count, 16);
equal(JSON.stringify(records), before);
equal(queryLabRecords([], defaults).pages, 1);
equal(queryLabRecords([{...records[0], name: 'Ángela Pérez'}], {...defaults, search: 'angela perez'}).total, 1);
for (let page = 1; page <= 5; page++) equal(query({page}).rows.every(row => row.id >= (page-1)*10+1 && row.id <= page*10), true);

const anchor = {left: 100, top: 100, bottom: 136, width: 158};
let popup = positionLabPopover(anchor, {width: 1200, height: 800}, 300, 320);
equal([popup.left, popup.top, popup.width, popup.placement], [100,141,300,'bottom']);
popup = positionLabPopover({...anchor, top: 680, bottom: 716}, {width: 1200, height: 800}, 300, 320);
equal([popup.top, popup.placement], [355,'top']);
popup = positionLabPopover({...anchor, left: 1100}, {width: 1200, height: 800}, 300, 320);
equal(popup.left, 892);
popup = positionLabPopover(anchor, {width: 320, height: 480}, 420, 700);
equal(popup.width, 304);
equal(popup.top + popup.maxHeight <= 472, true);
popup = positionLabPopover({...anchor, left: 260, top: 200, bottom: 236}, {width: 320, height: 400, left: 200, top: 100}, 300, 220);
equal(popup.left >= 208 && popup.left + popup.width <= 512 && popup.top >= 108, true);
equal(balancedKpiColumns(1600), 6);
equal(balancedKpiColumns(1550), 6);
equal(balancedKpiColumns(1549), 3);
equal(balancedKpiColumns(770), 3);
equal(balancedKpiColumns(510), 2);
equal(balancedKpiColumns(509), 1);
for (let width = 240; width <= 1920; width += 10) {
  equal([1,2,3,6].includes(balancedKpiColumns(width)), true);
  for (const top of [10, 200, 460]) {
    const p = positionLabPopover({left: width-40, top, bottom: top+36, width: 158}, {width, height: 520}, 300, 360);
    equal(p.left >= 8 && p.left + p.width <= width-8 && p.top >= 8 && p.top + Math.min(360, p.maxHeight) <= 512, true);
  }
}
console.log(`PASS: ${checks} CRUD, pagination, sorting, overlay collision/zoom and KPI assertions.`);
