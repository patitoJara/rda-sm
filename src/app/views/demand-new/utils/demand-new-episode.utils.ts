export function calculatePreviousTreatmentNumber(data: any): number {
  const episodes = Array.isArray(data?.previousEpisodes)
    ? data.previousEpisodes
    : Array.isArray(data?.episodes)
      ? data.episodes
      : [];

  const events = Array.isArray(data?.events) ? data.events : [];

  const completedEpisodes = [...episodes]
    .filter((episode: any) => {
      const isStillActive =
        episode?.active === true &&
        !episode?.egressAt &&
        !episode?.closedAt;

      return !isStillActive;
    })
    .sort(compareEpisodesChronologically);

  return completedEpisodes.reduce((total: number, episode: any) => {
    const registeredNumber = normalizePreviousTreatmentNumber(
      episode?.previousTreatmentNumber ??
        episode?.previous_treatment_number,
    );

    /*
     * Conserva el mayor valor acumulado registrado manualmente.
     * Esto evita perder tratamientos históricos que no existen
     * como episodios dentro del sistema nuevo.
     */
    const accumulatedNumber = Math.max(total, registeredNumber);

    /*
     * El episodio anterior suma un tratamiento solamente cuando
     * efectivamente tuvo ingreso a tratamiento.
     */
    return hasTreatmentEntry(episode, events)
      ? accumulatedNumber + 1
      : accumulatedNumber;
  }, 0);
}

function hasTreatmentEntry(episode: any, events: any[]): boolean {
  const hasEntryDate = Boolean(
    episode?.entryToTreatmentAt ??
      episode?.entry_to_treatment_at,
  );

  if (hasEntryDate) {
    return true;
  }

  const episodeId = Number(episode?.id ?? episode?.episodeId);

  const hasNestedEntryEvent = Array.isArray(episode?.events)
    ? episode.events.some(isTreatmentEntryEvent)
    : false;

  const hasLongitudinalEntryEvent =
    Number.isFinite(episodeId) &&
    events.some((event: any) => {
      const eventEpisodeId = Number(
        event?.episodeId ?? event?.episode_id,
      );

      return (
        eventEpisodeId === episodeId &&
        isTreatmentEntryEvent(event)
      );
    });

  return hasNestedEntryEvent || hasLongitudinalEntryEvent;
}

function isTreatmentEntryEvent(event: any): boolean {
  const eventCode =
    event?.eventType?.code ??
    event?.eventTypeCode ??
    event?.event_type_code ??
    '';

  return eventCode === 'INGRESO_TRATAMIENTO';
}

function normalizePreviousTreatmentNumber(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.trunc(parsed);
}

function compareEpisodesChronologically(a: any, b: any): number {
  const dateA = getEpisodeDateValue(a);
  const dateB = getEpisodeDateValue(b);

  if (dateA !== dateB) {
    return dateA - dateB;
  }

  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
}

function getEpisodeDateValue(episode: any): number {
  const date =
    episode?.createdAt ??
    episode?.originalRequestDate ??
    episode?.created_at ??
    episode?.original_request_date;

  const parsedDate = Date.parse(String(date ?? ''));

  return Number.isFinite(parsedDate)
    ? parsedDate
    : Number(episode?.id ?? 0);
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