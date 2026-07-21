export function calculatePreviousTreatmentNumber(data: any): number {
  const previousEpisodes = data?.previousEpisodes ?? data?.episodes ?? [];

  return previousEpisodes.filter((episode: any) => {
    const hasEntryDate = Boolean(
      episode.entryToTreatmentAt ?? episode.entry_to_treatment_at,
    );

    const hasEntryEvent = (episode.events ?? []).some(
      (event: any) =>
        event.eventType?.code === 'INGRESO_TRATAMIENTO' ||
        event.eventTypeCode === 'INGRESO_TRATAMIENTO',
    );

    return hasEntryDate || hasEntryEvent;
  }).length;
}

export function getCurrentEpisodeId(
  createdEpisode: any,
  episodeSummary: any,
): number | null {
  const id =
    createdEpisode?.id ??
    createdEpisode?.episodeId ??
    episodeSummary?.id ??
    episodeSummary?.episodeId ??
    null;

  const parsed = Number(id);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}