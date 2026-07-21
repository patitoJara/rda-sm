import { todayDateOnly } from './demand-new-date.utils';

export function isExpiredCitation(item: any): boolean {
  const eventDate = String(item?.eventDate ?? '');

  return !!eventDate && eventDate < todayDateOnly();
}

export function isTodayCitation(item: any): boolean {
  const eventDate = String(item?.eventDate ?? '');

  return !!eventDate && eventDate === todayDateOnly();
}

export function isFutureCitation(item: any): boolean {
  const eventDate = String(item?.eventDate ?? '');

  return !!eventDate && eventDate > todayDateOnly();
}

export function getCitationNumber(
  item: any,
  citationEvents: any[],
): number {
  const ordered = [...(citationEvents ?? [])].sort((a: any, b: any) => {
    const dateA = `${a?.eventDate ?? ''}T${a?.eventTime ?? '00:00:00'}`;
    const dateB = `${b?.eventDate ?? ''}T${b?.eventTime ?? '00:00:00'}`;

    return dateA.localeCompare(dateB);
  });

  const index = ordered.findIndex(
    (event: any) => Number(event?.id) === Number(item?.id),
  );

  return index >= 0 ? index + 1 : 0;
}

export function getCitationTemporalLabel(item: any): string {
  if (isExpiredCitation(item)) {
    return 'Vencida pendiente';
  }

  if (isTodayCitation(item)) {
    return 'Citación de hoy';
  }

  if (isFutureCitation(item)) {
    return 'Próxima citación';
  }

  return 'Sin fecha';
}