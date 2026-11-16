// State-transition tests with a fake clock and DOM boundary. Not browser/ARIA validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let checks = 0, now = 0, timerId = 0;
const timers = new Map();
const documentStub = {activeElement: null};
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
function tick(ms) {
  const end = now + ms;
  while (true) {
    const entry = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!entry) break;
    timers.delete(entry[0]); now = entry[1].at; entry[1].callback();
  }
  now = end;
}
function load(file) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, file + '.ts'), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true},
  });
  const dependencies = name => {
    if (name.endsWith('.utils')) return load(name.slice(2));
    return new Proxy({}, {get: () => () => () => {}});
  };
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', 'Date', 'document', compiled.outputText)(
    dependencies, exports,
    (callback, delay) => { const id = ++timerId; timers.set(id, {callback, at: now + delay}); return id; },
    id => timers.delete(id), {now: () => now}, documentStub,
  );
  return exports;
}
const {UiLabCrudComponent} = load('ui-lab-crud.component');
function element() {
  return {open: false, isConnected: true, focused: 0,
    focus() { this.focused++; documentStub.activeElement = this; },
    show() { this.open = true; }, showModal() { this.open = true; }, close() { this.open = false; }};
}
const component = new UiLabCrudComponent();
for (const key of ['drawer', 'editorTitle', 'listTitle', 'deleteDialog']) component[key] = {nativeElement: element()};
const origin = element(); origin.focus();
component.openEditor('edit', component.records[0]);
equal(component.drawerOpen, true);
equal(component.dirty, false);
equal(documentStub.activeElement, component.editorTitle.nativeElement);
component.draft.name = 'Cambio pendiente';
component.requestClose();
equal(component.drawerOpen, true);
equal(component.discardPrompt, true);
component.keepEditing();
equal(component.draft.name, 'Cambio pendiente');
equal(component.discardPrompt, false);
component.openEditor('view', component.records[1]);
equal(component.draft.name, 'Cambio pendiente');
component.discardChanges();
equal(component.draft.id, component.records[1].id);
equal(component.mode, 'view');
component.requestClose();
equal(component.drawerOpen, false);
equal(documentStub.activeElement, origin);

component.openEditor('create');
component.save();
equal(component.saving, false);
equal(component.formError.length > 0, true);
equal(component.records.length, 48);
component.draft = {...component.draft, name: 'Nueva muestra', rut: '12.345.678-5', date: '06/10/2026', program: component.programOptions[0].value};
component.save(); component.save();
equal(component.saving, true);
component.requestClose();
equal(component.drawerOpen, true);
component.openEditor('view', component.records[0]);
equal(component.mode, 'create');
tick(1199);
equal(component.records.length, 48);
tick(1);
equal(component.records.length, 49);
equal(component.records.at(-1).date, '2026-10-06');
equal(component.saving, false);
equal(component.mode, 'view');
equal(component.dirty, false);
equal(component.toasts.length, 1);

component.openEditor('edit', component.records[0]);
component.draft.name = 'Editado'; component.save(); tick(1200);
equal(component.records.length, 49);
equal(component.records[0].name, 'Editado');
equal(component.toasts.length, 2);
component.duplicate(component.records[0]);
equal(component.mode, 'create');
equal(component.dirty, true);
component.requestClose(); component.discardChanges();
equal(component.drawerOpen, false);
equal(component.records.length, 49);

const first = component.records[0];
component.askDelete(first, origin); component.cancelDelete();
equal(component.records.includes(first), true);
component.askDelete(first, origin); component.confirmDelete();
equal(component.records.includes(first), false);
equal(component.records.length, 48);
equal(component.toasts.length, 2); // Deletion is a modal decision, not a toast.
component.togglePage();
equal(component.selected.size, 10);
component.page = 2; component.togglePage();
equal(component.selected.size, 20);
component.togglePage();
equal(component.selected.size, 10);
component.setMultiSample(15);
equal(component.multiSelection.size, 15);
equal(component.multiSelection.has(component.multiOptions[15].value), false);
component.multiSearch = '999';
equal(component.filteredMultiOptions.length, 0);
const popup = {opened: false, open() { this.opened = true; }};
component.showAutocomplete('empty', popup, origin);
equal(component.suggestions.length, 0);
component.showAutocomplete('results', popup, origin);
equal(component.suggestions.length, 5);
component.showAutocomplete('selected', popup, origin);
equal(component.autoChoice, component.people[0]);

component.toasts.slice().forEach(toast => component.closeToast(toast.id));
component.notify('Primero'); component.notify('Segundo');
const [one, two] = component.toasts;
tick(1000);
component.pauseToast(one.id, 'hover', true);
equal(one.remaining, 5500);
component.pauseToast(one.id, 'focus', true);
tick(2000);
component.pauseToast(one.id, 'hover', false);
tick(3500);
equal(component.toasts.map(toast => toast.id), [one.id]); // Second expires independently.
component.pauseToast(one.id, 'focus', false);
tick(5499);
equal(component.toasts.length, 1);
tick(1);
equal(component.toasts.length, 0); // Resume remaining time, not another full lifetime.
component.notify('Cierre manual');
component.closeToast(component.toasts[0].id);
equal(component.toasts.length, 0);
component.notify('Limpieza'); component.ngOnDestroy();
equal(timers.size, 0);
console.log(`PASS: ${checks} interaction assertions (drawer, unsaved changes, save, selection, deletion, autocomplete and independent toast timers).`);
