export function filterObservationEvents(episodeEvents: any[]): any[] {
  return (episodeEvents ?? []).filter(
    (event: any) => event?.eventType?.code === 'OBSERVACION',
  );
}