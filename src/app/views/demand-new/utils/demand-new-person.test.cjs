// AG-RDA-SM-DEM-002: execute actual component methods with controlled REST responses.
// No network requests or Angular bootstrap; persistence is simulated, not certified.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Subject, EMPTY, of, throwError } = require('rxjs');
const { switchMap, finalize, map } = require('rxjs/operators');
const file = path.join(__dirname, '../demand-new.component.ts');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'DemandNewComponent');
const names = ['savePerson', 'searchPerson', 'openEditPersonForm', 'closePersonForm',
  'canManageCurrentEpisode', 'canEnterEpisodeManagement', 'enterEpisodeManagement',
  'isEpisodeViewMode', 'personEditRestriction', 'selectAvailableEpisodeStage', 'canEditPerson', 'showModifyDemandantButton'];
const members = declaration.members.filter(m => names.includes(m.name?.getText(source))).map(m => m.getText(source)).join('\n');
const js = ts.transpileModule(`class Tested { ${members} }; return Tested;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const dependencies = { EMPTY, of, throwError, switchMap, finalize, map,
  formatPersonName: v => v.trim(), formatRut: v => v, formatDateForBackend: () => '1990-01-01',
  toStringOrNull: v => v?.trim() || null, requestAnimationFrame: fn => fn(),
  episodeIdentity: e => e?.id ?? null, resolveStageProgramId: s => s?.program?.id ?? s?.programId,
  resolveEpisodeAccessModeFromProgramContext: (program, c) =>
    c?.programId === program && c?.stageId > 0 && c.closed === false ? 'MANAGE' : 'VIEW',
  console: { log() {}, error() {}, warn() {} },
};
const Tested = new Function(...Object.keys(dependencies), js)(...Object.values(dependencies));
function fixture() {
  const target = new Tested(), person = new Subject(), contact = new Subject(), get = new Subject();
  const calls = [];
  const raw = { rut: '11111111-1', firstName: 'Ana', secondName: '', firstLastName: 'Perez',
    secondLastName: '', birthDate: new Date(1990, 0, 1), sex: 1, commune: 2, intPrev: 3, convPrev: 4,
    phone: '', email: '', address: '', contactName: 'Contacto', contactDescription: '', contactCellphone: '', contactEmail: '' };
  Object.assign(target, { contextGeneration: 1, selectedPerson: { id: 10, email: 'old@example.test', lastName: 'Old', phone: '123' },
    selectedContact: { id: 20 }, tokenService: { getUserId: () => 1, getActiveRole: () => 'ADMINISTRATIVO' },
    activeProgramId: 7, hasCurrentEpisode: true, selectedEpisodeId: 30, episodeSummary: { id: 30 }, createdEpisode: { id: 30 },
    workingStageId: 40, workingStage: { id: 40, program: { id: 7 } },
    currentProgramContext: { episodeId: 30, stageId: 40, programId: 7, closed: false },
    selectedContext: { episode: { id: 30 }, stages: [{ id: 40, episodeId: 30, program: { id: 7 } }], issues: [] },
    requestedEpisodeId: 30, requestedMode: 'manage',
    personForm: { invalid: false, getRawValue: () => raw, markAllAsTouched() {}, markAsPristine() {}, markAsUntouched() {} },
    patchPersonForm(value) { this.patched = value; }, loadEpisodeLongitudinal(id) { calls.push(['episode', id]); },
    getAvailableEpisodeStages: () => [{ id: 40 }],
    postulantService: { update: (id, data) => { calls.push(['person', id, data]); return person; },
      create: data => { calls.push(['create', data]); return person; }, getById: id => { calls.push(['get', id]); return get; } },
    contactService: { update: (id, data) => { calls.push(['contact', id, data]); return contact; },
      createDto: data => { calls.push(['createContact', data]); return contact; },
      getByPostulant: id => { calls.push(['getContact', id]); return of(target.selectedContact); } },
  });
  return { target, person, contact, get, calls, raw };
}
function respond(subject, value) { subject.next(value); subject.complete(); }
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
check('R06 A/B: creation unchanged and existing person without episode uses detail editor only', () => {
  const f = fixture(); Object.assign(f.target, { selectedPerson: null, hasCurrentEpisode: false });
  assert.equal(f.target.showModifyDemandantButton, false); f.target.savePerson();
  assert.equal(f.calls[0][0], 'create');
  const g = fixture(); Object.assign(g.target, { hasCurrentEpisode: false });
  assert.equal(g.target.canEditPerson, true); assert.equal(g.target.showModifyDemandantButton, false);
  g.target.openEditPersonForm(); assert.equal(g.target.showCreatePersonForm, true);
});
check('R06 C: manageable episode shows modification button', () => {
  const f = fixture(); assert.equal(f.target.showModifyDemandantButton, true);
});
check('R06 D: closed episode with historical program allows person edit and save, never episode management', () => {
  for (const stage of [{ id: 40, episodeId: 30, program: { id: 7 } }, { id: 40, episodeId: 30, programId: 7 }]) {
    const f = fixture(); Object.assign(f.target, { isHistoricalEpisode: true, requestedMode: 'view',
      workingStage: { id: 41, program: { id: 8 } }, requestedStageId: 41,
      selectedContext: { episode: { id: 30 }, stages: [stage], issues: [] } });
    f.target.currentProgramContext.closed = true;
    assert.equal(f.target.showModifyDemandantButton, true); assert.equal(f.target.canManageCurrentEpisode, false);
    f.target.openEditPersonForm(); assert.equal(f.target.showCreatePersonForm, true);
    f.target.savePerson(); assert.equal(f.calls[0][0], 'person');
    assert.equal(f.target.canManageCurrentEpisode, false);
  }
});
check('R06 E: unrelated program, unauthorized role, invalid or pending context cannot edit', () => {
  for (const change of [
    { selectedContext: { stages: [{ programId: 8 }], issues: [] } },
    { selectedContext: { stages: [], issues: [] }, personLongitudinal: { stages: [{ episodeId: 999, programId: 7 }] } },
    { tokenService: { getActiveRole: () => 'SUPERVISOR' } },
    { activeProgramId: null }, { isLoadingLongitudinal: true }, { episodeContextError: 'mismatch' },
    { createdEpisode: { id: 999 } }, { selectedContext: { stages: [{ programId: 7 }], issues: ['ambiguous'] } },
  ]) {
    const f = fixture(); Object.assign(f.target, { isHistoricalEpisode: true }, change);
    assert.equal(f.target.showModifyDemandantButton, false); f.target.openEditPersonForm();
    assert.equal(f.target.showCreatePersonForm, false); f.target.savePerson(); assert.equal(f.calls.length, 0);
  }
  const active = fixture(); active.target.currentProgramContext.programId = 8;
  assert.equal(active.target.showModifyDemandantButton, false);
});
check('authorized editor opens, unauthorized editor and save stay blocked', () => {
  const f = fixture(); f.target.openEditPersonForm(); assert.equal(f.target.showCreatePersonForm, true);
  f.target.tokenService.getActiveRole = () => 'PROFESIONAL'; f.target.openEditPersonForm();
  assert.equal(f.target.showCreatePersonForm, false); f.target.savePerson(); assert.equal(f.calls.length, 0);
  assert.match(f.target.personEditRestriction, /perfil/);
});
check('view selection requires explicit management; incompatible and closed contexts stay blocked', () => {
  const f = fixture(); f.target.selectAvailableEpisodeStage({ id: 30 }, { id: 40 });
  assert.equal(f.target.canManageCurrentEpisode, false); f.target.enterEpisodeManagement();
  assert.equal(f.target.canManageCurrentEpisode, true);
  for (const change of [{ isHistoricalEpisode: true }, { currentProgramContext: { episodeId: 30, stageId: 99 } },
    { workingStage: { program: { id: 8 } } }, { episodeContextError: 'mismatch' }]) {
    const g = fixture(); Object.assign(g.target, change, { requestedMode: 'view', requestedStageId: 40 });
    g.target.enterEpisodeManagement(); assert.equal(g.target.canManageCurrentEpisode, false);
  }
});
check('cleared fields remain cleared; informed server values win; omitted values use submission', () => {
  const f = fixture(); f.target.savePerson(); respond(f.person, { id: 10 });
  assert.equal(f.calls[1][2].cellphone, ''); respond(f.contact, { id: 20, name: 'Contacto' });
  respond(f.get, { id: 10, email: null, firstName: 'ANA SERVER', phone: undefined });
  assert.equal(f.target.selectedPerson.email, null); assert.equal(f.target.selectedPerson.lastName, null);
  assert.equal(f.target.selectedPerson.phone, null); assert.equal(f.target.selectedPerson.firstName, 'ANA SERVER');
  assert.equal(f.target.showCreatePersonForm, false); assert.equal(f.target.isSavingPerson, false);
  assert.ok(f.calls.some(c => c[0] === 'episode')); assert.match(f.target.personSaveStatus, /recuperados/);
});
check('contact creation uses saved identity', () => {
  const f = fixture(); f.target.selectedContact = null; f.target.savePerson(); respond(f.person, { id: 10 });
  assert.equal(f.calls[1][0], 'createContact'); assert.equal(f.calls[1][1].postulantId, 10);
  respond(f.contact, { id: 21 }); respond(f.get, { id: 10 }); assert.equal(f.target.selectedContact.id, 21);
});
check('person failure does not continue', () => {
  const f = fixture(); f.target.savePerson(); f.person.error({ status: 403 });
  assert.equal(f.calls.length, 1); assert.match(f.target.personSaveError, /permisos/);
});
check('contact failure reports partial persistence and keeps editor available', () => {
  const f = fixture(); f.target.showCreatePersonForm = true; f.target.savePerson(); respond(f.person, { id: 10 });
  f.contact.error({ status: 500 }); assert.match(f.target.personSaveError, /persona fue guardada.*referente/);
  assert.equal(f.target.showCreatePersonForm, true); assert.equal(f.target.personSaveStatus, null);
});
check('GET failure identifies both completed writes', () => {
  const f = fixture(); f.target.savePerson(); respond(f.person, { id: 10 }); respond(f.contact, { id: 20 });
  f.get.error({ status: 503 }); assert.match(f.target.personSaveError, /referente fueron guardados.*recuperaci/);
});
check('contact GET failure is reported as recovery failure, not a failed write', () => {
  const f = fixture(); f.target.contactService.getByPostulant = () => throwError(() => ({ status: 503 }));
  f.target.savePerson(); respond(f.person, { id: 10 }); respond(f.contact, { id: 20 }); respond(f.get, { id: 10 });
  assert.match(f.target.personSaveError, /referente fueron guardados.*recuperaci/);
  assert.equal(f.target.personSaveStatus, null);
});
check('search is blocked during save and stale responses cannot replace a new context', () => {
  for (const pending of ['person', 'contact', 'get']) {
    const f = fixture(); f.target.savePerson(); f.target.searchPerson(); assert.match(f.target.searchError, /Espere/);
    if (pending !== 'person') respond(f.person, { id: 10 });
    if (pending === 'get') respond(f.contact, { id: 20 });
    f.target.contextGeneration++; f.target.selectedPerson = { id: 999 }; f.target.selectedContact = { id: 888 };
    respond(f[pending], { id: pending === 'contact' ? 20 : 10 });
    assert.equal(f.target.selectedPerson.id, 999); assert.equal(f.target.selectedContact.id, 888);
    assert.equal(f.target.isSavingPerson, false);
  }
});
console.log(`${checks} scenario groups passed (mock REST; no real persistence verified).`);
