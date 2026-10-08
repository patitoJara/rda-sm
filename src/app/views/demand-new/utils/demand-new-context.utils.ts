/** The API is person-longitudinal, including when requested through /episodes/:id. */
export interface SelectedEpisodeContext {
  episodeId: number | null;
  episode: any | null;
  stages: any[];
  events: any[];
  references: any[];
  issues: string[];
}

export function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function episodeIdentity(value: any): number | null {
  return positiveId(value?.id ?? value?.episodeId);
}

export function ownerEpisodeId(value: any): number | null {
  return positiveId(value?.episodeId ?? value?.episode_id ?? value?.episode?.id);
}

export function eventStageId(value: any): number | null {
  return positiveId(value?.stageId ?? value?.stage?.id ?? value?.demandStageId);
}

export function longitudinalEpisodes(data: any): any[] {
  const byId = new Map<number, any>();
  // More specific representations override the person-level summaries, for the same ID only.
  for (const item of [...(data?.previousEpisodes ?? []), ...(data?.episodes ?? []), data?.activeEpisode, data?.episode]) {
    const id = episodeIdentity(item);
    if (id) byId.set(id, {...byId.get(id), ...item, id});
  }
  return [...byId.values()];
}

export function selectEpisodeContext(data: any, requestedId: number | null): SelectedEpisodeContext {
  const episodeId = positiveId(requestedId);
  const episodes = longitudinalEpisodes(data);
  const episode = episodes.find(item => item.id === episodeId) ?? null;
  const issues = new Set<string>();
  const result: SelectedEpisodeContext = {episodeId, episode, stages: [], events: [], references: [], issues: []};
  if (!episode) {
    if (episodeId) result.issues.push('No se encontró el episodio solicitado. No se seleccionó otro episodio.');
    return result;
  }
  const allEvents: any[] = Array.isArray(data?.events) ? data.events : [];
  const allStages: any[] = Array.isArray(data?.stages) ? data.stages : [];
  const owners = new Map<number, number>();
  for (const stage of allStages) {
    const id = positiveId(stage?.id ?? stage?.stageId);
    if (!id) { issues.add('Hay etapas sin identificador verificable.'); continue; }
    const explicitOwner = ownerEpisodeId(stage);
    // Older stage DTOs omit episodeId. Use real event/episode identifiers, never program/date.
    const evidence = new Set<number>([
      ...allEvents.filter(event => eventStageId(event) === id).map(ownerEpisodeId),
      ...episodes.filter(item => positiveId(item.currentStageId) === id).map(episodeIdentity),
    ].filter((value): value is number => value !== null));
    const owner = explicitOwner ?? (evidence.size === 1 ? [...evidence][0] : null);
    if (!owner) { issues.add('Hay etapas cuya pertenencia a un episodio no pudo verificarse.'); continue; }
    owners.set(id, owner);
    if (owner === episodeId) result.stages.push({...stage, id, episodeId: owner});
  }
  const selectedStageIds = new Set(result.stages.map(stage => stage.id));
  for (const event of allEvents) {
    const explicitOwner = ownerEpisodeId(event);
    const stageId = eventStageId(event);
    const stageOwner = stageId ? owners.get(stageId) : null;
    const owner = explicitOwner ?? stageOwner;
    if (!owner) { issues.add('Hay gestiones sin episodio verificable.'); continue; }
    if (explicitOwner && stageOwner && explicitOwner !== stageOwner) {
      issues.add('Hay gestiones cuyo episodio no corresponde a su etapa.'); continue;
    }
    if (owner !== episodeId) continue;
    if (stageId && !selectedStageIds.has(stageId)) {
      issues.add('Hay gestiones con una etapa no verificable del episodio.'); continue;
    }
    result.events.push({...event, episodeId: owner, ...(stageId ? {stageId} : {})});
  }
  const selectedEventIds = new Set(result.events.map(event => positiveId(event.id)));
  result.events = result.events.filter(event => {
    const relatedId = positiveId(event.relatedEventId ?? event.relatedEvent?.id ?? event.citationEventId);
    if (relatedId && !selectedEventIds.has(relatedId)) {
      issues.add('Hay gestiones vinculadas a un evento fuera del episodio o no disponible.'); return false;
    }
    return true;
  });
  for (const reference of Array.isArray(data?.references) ? data.references : []) {
    const owner = ownerEpisodeId(reference);
    const origin = positiveId(reference?.originStageId);
    const destination = positiveId(reference?.destinationStageId);
    const touchesSelected = (origin && selectedStageIds.has(origin)) || (destination && selectedStageIds.has(destination));
    if (owner !== episodeId && !touchesSelected) continue;
    if ((owner && owner !== episodeId) || !origin || !destination || !selectedStageIds.has(origin) || !selectedStageIds.has(destination)) {
      issues.add('Hay referencias con etapas que no corresponden al mismo episodio.'); continue;
    }
    result.references.push({...reference, episodeId});
  }
  if (positiveId(episode.currentStageId) && !selectedStageIds.has(Number(episode.currentStageId))) {
    issues.add('La etapa actual indicada no pertenece al episodio cargado.');
  }
  result.issues = [...issues];
  return result;
}

export function validateEpisodeOperation(context: SelectedEpisodeContext, episodeId: unknown, stageId: unknown, programId: unknown, relatedEventId?: unknown): boolean {
  const stage = context.stages.find(item => item.id === positiveId(stageId));
  if (context.issues.length || !context.episode || context.episodeId !== positiveId(episodeId) || !stage ||
      positiveId(stage.programId ?? stage.program?.id) !== positiveId(programId) || !positiveId(programId)) return false;
  if (relatedEventId != null) {
    const event = context.events.find(item => positiveId(item.id) === positiveId(relatedEventId));
    if (!event || eventStageId(event) !== stage.id || event.deletedAt || event.deleted_at) return false;
  }
  return true;
}
