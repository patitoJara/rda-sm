// Synthetic regression checks. No browser, network, Angular bootstrap or filesystem writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {Subject, of} = require('rxjs');
const {finalize} = require('rxjs/operators');
const base = path.resolve(__dirname, '..');
const cache = new Map();
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
function load(file) {
  const filename = path.resolve(base, file.endsWith('.ts') ? file : file + '.ts');
  if (cache.has(filename)) return cache.get(filename);
  const out = {}; cache.set(filename, out);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  new Function('require', 'exports', js)(name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : require(name), out);
  return out;
}
const context = load('utils/demand-new-context.utils');
const stages = load('utils/demand-new-stage.utils');
const current = load('utils/demand-new-current-stage.utils');
const episodes = load('utils/demand-new-episode.utils');
const trajectory = load('utils/demand-new-trajectory.utils');
const permissions = load('utils/demand-new-permission.utils');
const milestone = load('utils/demand-new-milestone.utils');
const historical = {id: 44, code: 'DEM-000044', originalRequestDate: '2026-08-28', currentStageId: 49, active: false, stateCode: 'CERRADO', closedAt: '2026-09-22', resultCode: 'ABANDONO', previousTreatmentNumber: 0};
const active = {id: 186, code: 'DEM-000186', originalRequestDate: '2026-10-02', createdAt: '2026-10-08', currentStageId: 214, active: true, stateCode: 'EN_TRAMITE', previousTreatmentNumber: 0};
const stage49 = {id: 49, episodeId: 44, program: {id: 7, name: 'Programa de prueba'}, stageOrder: 1, current: true, receivedAt: '2026-08-28', stateCode: 'CERRADO', closedAt: '2026-09-22'};
const stage214 = {id: 214, episodeId: 186, program: {id: 7, name: 'Programa de prueba'}, stageOrder: 1, current: true, receivedAt: '2026-10-02', stateCode: 'EN_TRAMITE'};
function event(id, episodeId, stageId, eventTypeCode, eventDate, extra = {}) { return {id, episodeId, stageId, eventTypeCode, eventDate, ...extra}; }
const history = {
  postulant: {id: 999}, activeEpisode: active, episodes: [historical, active], stages: [stage49, stage214], references: [],
  events: [event(1,44,49,'CITACION','2026-09-04'), event(2,44,49,'ASISTENCIA','2026-09-04',{relatedEventId:1,attendanceStatusCode:'SE_PRESENTO'}),
    event(3,44,49,'RETROALIMENTACION','2026-09-11'), event(4,44,49,'CIERRE','2026-09-22'), event(5,186,214,'OBSERVACION','2026-10-08')],
};
const original = JSON.stringify(history);
const a = context.selectEpisodeContext(history,44), b = context.selectEpisodeContext(history,186);
equal(a.episode.id,44); equal(a.stages.map(x=>x.id),[49]); equal(a.events.map(x=>x.id),[1,2,3,4]); equal(a.issues,[]);
equal(b.episode.id,186); equal(b.stages.map(x=>x.id),[214]); equal(b.events.map(x=>x.id),[5]); equal(b.issues,[]);
equal(JSON.stringify(history),original); equal(context.longitudinalEpisodes(history).length,2);
equal(context.selectEpisodeContext(history,1234).episode,null);
equal(context.selectEpisodeContext({...history,episode:active},44).episode.id,44);
equal(context.selectEpisodeContext(history,null).events,[]);
equal(episodes.getCurrentEpisodeId(active,historical),null);
equal(episodes.getCurrentEpisodeId(historical,historical),44);
equal(context.selectEpisodeContext({...history,stages:history.stages.map(({episodeId,...s})=>s)},44).stages[0].id,49);
equal(context.selectEpisodeContext({...history,events:[...history.events,event(8,44,214,'OBSERVACION','2026-10-08')]},44).events.length,4);
equal(context.selectEpisodeContext({...history,events:[...history.events,event(8,44,214,'OBSERVACION','2026-10-08')]},44).issues.length>0,true);
equal(context.selectEpisodeContext({...history,events:[...history.events,event(8,186,214,'ASISTENCIA','2026-10-08',{relatedEventId:1})]},186).events.length,1);
equal(context.selectEpisodeContext({...history,events:[...history.events,{id:9,eventTypeCode:'OBSERVACION'}]},44).issues.length>0,true);
equal(context.validateEpisodeOperation(b,186,214,7),true);
for (const args of [[44,214,7],[186,49,7],[186,214,8],[186,null,7],[186,214,null],[186,214,7,1]]) equal(context.validateEpisodeOperation(b,...args),false);
equal(context.validateEpisodeOperation(a,44,49,7,1),true);
equal(current.resolveCurrentEpisodeStage({stages:[stage214,stage49],activeEpisode:active},historical).id,49);
equal(trajectory.buildCompactProgramTrajectory(a.stages,a.references,a.events,a.episode.originalRequestDate)[0].entryDate,'2026-08-28');
equal(trajectory.buildCompactProgramTrajectory(a.stages,a.references,a.events,a.episode.originalRequestDate)[0].closureDate,'2026-09-22');
equal(current.resolveLatestOperationalStageEvent(a.events,stage49).id,4);
equal(current.resolveLatestOperationalStageEvent(b.events,stage214).id,5);
equal(milestone.filterFeedbackEvents(a.events,49).length,1);
equal(milestone.filterFeedbackEvents(b.events,214).length,0);
equal(milestone.filterPresentedCitations([a.events[0]],a.events).length,1);
const referenceHistory={...history,stages:[...history.stages,{id:215,episodeId:186,stageOrder:2,program:{id:8}}],references:[{id:3,episodeId:186,originStageId:214,destinationStageId:215,referenceDate:'2026-10-09'}]};
const referenced=context.selectEpisodeContext(referenceHistory,186);
equal(referenced.references.length,1); equal(context.selectEpisodeContext(referenceHistory,44).references.length,0);
equal(trajectory.buildCompactProgramTrajectory(referenced.stages,referenced.references,referenced.events,active.originalRequestDate).filter(x=>x.kind==='reference').length,1);
const crossed=context.selectEpisodeContext({...history,references:[{id:4,originStageId:49,destinationStageId:214}]},44);
equal(crossed.references.length,0);equal(crossed.issues.length>0,true);
equal(episodes.calculatePreviousTreatmentNumber(history),0); // Abandonment is not treatment entry.
const entered={...historical,events:[event(10,44,49,'INGRESO_TRATAMIENTO','2026-09-10')]};
equal(episodes.calculatePreviousTreatmentNumber({episodes:[entered,entered],events:entered.events}),1);
equal(episodes.calculatePreviousTreatmentNumber({episodes:[{...historical,events:[event(10,186,214,'INGRESO_TRATAMIENTO','2026-10-08')]}]}),0);
equal(episodes.calculatePreviousTreatmentNumber({episodes:[{...entered,events:entered.events.map(x=>({...x,deletedAt:'2026-09-11'}))}]}),0);
equal(episodes.calculatePreviousTreatmentNumber({episodes:[{...entered,previousTreatmentNumber:3}]}),4);
equal(episodes.calculatePreviousTreatmentNumber({episodes:[entered,active]},44),0);
equal(episodes.calculatePreviousTreatmentNumber({episodes:[entered,active]},186),1);
equal(episodes.calculatePreviousTreatmentNumber({episodes:[{id:7,events:[event(10,7,1,'INGRESO_TRATAMIENTO','2026-10-08')]}]}),0);

// Run the actual component methods/getters with controlled observables at the API boundary.
// Extraction avoids bootstrapping Angular or starting production services; ngc validates integration separately.
function componentClass(file,className,names,deps) {
  const text=fs.readFileSync(path.resolve(base,file),'utf8'), ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name.text===className);
  const members=cls.members.filter(node=>names.includes(node.name?.getText(ast))).map(node=>node.getText(ast));
  equal(members.length,names.length);
  const js=ts.transpileModule('class Tested {'+members.join('\n')+'};exports.Tested=Tested;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const out={}; new Function('exports',...Object.keys(deps),js)(out,...Object.values(deps)); return out.Tested;
}
const deps={...context,...stages,...current,...episodes,...trajectory,...permissions,...milestone,finalize,requestAnimationFrame:()=>{},console:{log(){},error(){},warn(){}}};
const names=['clearSelectedEpisode','applyLongitudinalData','loadEpisodeLongitudinal','loadEpisodeProgramContext','selectedEpisodeId','currentEpisodeStage','workingStage','workingStageId','workingStageEvents','resolvedCurrentStageId','currentStageEvents','currentDocumentEpisodeId','currentDocumentStageId','isHistoricalEpisode','hasCurrentEpisode','canManageCurrentEpisode','ensureOperationContext','compactProgramTrajectory','availableEpisodes','selectAvailableEpisode','feedbackEvents','lastCurrentStageEvent'];
const Tested=componentClass('demand-new.component.ts','DemandNewComponent',names,deps);
function fixture() {
  const target=new Tested(), requests=[], persons=[], contexts=[], substances=[];
  const form={reset(){},patchValue(){},markAsPristine(){},markAsUntouched(){}};
  Object.assign(target,{contextGeneration:0,selectedContext:context.selectEpisodeContext(null,null),longitudinal:null,personLongitudinal:null,tokenService:{getActiveProgramId:()=>7,getActiveRole:()=>'ADMINISTRATIVO'},activeProgramId:7,episodeForm:form,patchPersonForm(){},loadContactByPostulant(){},initializeSummarySectionObserver(){},demandEpisodeService:{getLongitudinalByEpisodeId:id=>{const response=new Subject();requests.push({id,response});return response;}},postulantService:{getById:id=>{const response=new Subject();persons.push({id,response});return response;}},demandService:{getEpisodeProgramContexts:input=>{const response=new Subject();contexts.push({input,response});return response;},getEpisodeSubstances:id=>{const response=new Subject();substances.push({id,response});return response;}}});
  return {target,requests,persons,contexts,substances};
}
function respond(request,value) { request.response.next(value);request.response.complete(); }
const f=fixture();f.target.loadEpisodeLongitudinal(44);respond(f.requests[0],{...history,episode:historical});
equal(f.target.selectedEpisodeId,44);equal(f.target.createdEpisode.id,44);equal(f.target.currentDocumentEpisodeId,44);equal(f.target.currentDocumentStageId,49);
equal(f.target.personLongitudinal.events.length,5);equal(f.target.episodeEvents.length,4);equal(f.target.availableEpisodes.length,2);equal(f.target.canManageCurrentEpisode,false);
equal(f.target.lastCurrentStageEvent.id,4);equal(f.target.feedbackEvents.length,1);
f.target.loadEpisodeLongitudinal(186);equal(f.target.episodeEvents,[]);equal(f.target.currentDocumentEpisodeId,null);
respond(f.requests[1],{...history,episode:active});
respond(f.contexts[1],[{episodeId:186,programId:7,stageId:214,closed:false}]);
equal(f.target.canManageCurrentEpisode,true);equal(f.target.ensureOperationContext(186,{stageId:214,programId:7}),true);
respond(f.persons[0],{id:999});respond(f.contexts[0],[{episodeId:44,programId:7,stageId:49,closed:true}]);respond(f.substances[0],[{episodeId:44}]);
equal(f.target.selectedEpisodeId,186);equal(f.target.workingStage.id,214);equal(f.target.episodeEvents.map(x=>x.id),[5]);equal(f.target.canManageCurrentEpisode,true);equal(f.target.episodeSubstances,[]);
equal(f.target.feedbackEvents.length,0);equal(f.target.lastCurrentStageEvent.id,5);
for (const mode of ['view','manage']) { f.target.requestedMode=mode;equal(f.target.canManageCurrentEpisode,mode==='manage'); }
f.target.requestedMode = 'manage';
for (const role of ['ADMIN', 'SUPERVISOR', 'PROFESIONAL']) {
  f.target.tokenService.getActiveRole = () => role;
  equal(f.target.canManageCurrentEpisode, false);
}
f.target.tokenService.getActiveRole = () => 'ADMINISTRATIVO';
equal(f.target.canManageCurrentEpisode, true);
equal(f.target.ensureOperationContext(44,{stageId:49,programId:7}),false);
equal(f.target.canManageCurrentEpisode,false); // A detected mismatch blocks further operations until reload.
const race=fixture();race.target.loadEpisodeLongitudinal(44);race.target.loadEpisodeLongitudinal(186);
respond(race.requests[1],history);respond(race.requests[0],{...history,episode:historical});equal(race.target.selectedEpisodeId,186);equal(race.target.episodeEvents.map(x=>x.id),[5]);
race.target.loadEpisodeLongitudinal(44);race.requests[2].response.error({status:500});equal(race.target.selectedEpisodeId,null);equal(race.target.episodeEvents,[]);equal(race.target.canManageCurrentEpisode,false);
const absent=fixture();absent.target.loadEpisodeLongitudinal(1234);respond(absent.requests[0],history);equal(absent.target.selectedEpisodeId,null);equal(absent.target.episodeLoaded,false);
const noProgram=fixture();noProgram.target.tokenService.getActiveProgramId=()=>null;noProgram.target.activeProgramId=null;
noProgram.target.loadEpisodeLongitudinal(44);respond(noProgram.requests[0],history);equal(noProgram.target.workingStage.id,49);equal(noProgram.target.feedbackEvents.length,1);equal(noProgram.target.canManageCurrentEpisode,false);

const Docs=componentClass('documents/episode-documents.component.ts','EpisodeDocumentsComponent',['loadDocuments','acceptsDocument'],{finalize});
const d=new Docs(), docRequests=[];d.requestGeneration=0;d.documentService={listDocuments:id=>{const response=new Subject();docRequests.push({id,response});return response;}};d.getActionErrorMessage=()=> 'Error';
d.episodeId=44;d.loadDocuments();d.episodeId=186;d.loadDocuments();
respond(docRequests[1],[{id:2,episodeId:186,uploadedAt:'2026-10-08'},{id:3,episodeId:44,uploadedAt:'2026-09-04'}]);
respond(docRequests[0],[{id:1,episodeId:44,uploadedAt:'2026-09-04'}]);equal(d.documents.map(x=>x.id),[2]);equal(d.loading,false);
equal(d.acceptsDocument({id:1,episodeId:44}),false);d.canManage=false;equal(d.acceptsDocument(d.documents[0],true),false);
d.episodeId=null;d.loadDocuments();equal(d.documents,[]);

// Payload builders must choose the selected program stage, never activeEpisode.currentStageId.
const scoped={...history,episode:historical,stages:a.stages,events:a.events};
const citation=load('actions/demand-new-citation.actions').buildCitationContext({raw:{eventDate:'2026-09-04',eventHour:'10:00',citationTypeCode:'C1_E1',programProfessionalId:1},programId:7,longitudinal:scoped});
equal(citation.valid,true);equal(citation.payload.stageId,49);
const attendance=load('utils/demand-new-attendance.utils').buildAttendancePayload({raw:{citationEventId:1,attendanceStatusId:1,comment:null},selectedCitation:a.events[0],programId:7,longitudinal:scoped});
equal(attendance.stageId,49);equal(attendance.relatedEventId,1);
const feedback=load('actions/demand-new-interview.actions').buildFeedbackContext({raw:{eventDate:'2026-09-11',eventHour:'10:00',programProfessionalId:1,biopsychosocialCommitmentCode:'BAJO',resultCode:'ABANDONO'},programId:7,longitudinal:scoped});
equal(feedback.valid,true);equal(feedback.payload.stageId,49);

// Existing tray navigation must preserve the episode ID and requested access mode.
const Tray=componentClass('../inicio/inicio.component.ts','InicioComponent',['openEpisode'],{});
const tray=new Tray();let navigation;tray.router={navigate:(...args)=>navigation=args};
tray.openEpisode({episodeId:44,rut:'SYNTHETIC'},'view');equal(navigation,[['/demand-new'],{queryParams:{rut:'SYNTHETIC',episodeId:44,mode:'view'}}]);
console.log(`PASS: ${checks} episode isolation assertions; synthetic data, no API writes.`);
