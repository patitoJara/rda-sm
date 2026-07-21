export function getEventSortDate(event: any): number {
  const eventDate = String(event?.eventDate ?? '').trim();
  const eventTime = String(event?.eventTime ?? '00:00:00')
    .trim()
    .slice(0, 8);

  if (eventDate) {
    const parsed = new Date(`${eventDate}T${eventTime}`).getTime();

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const createdAt = new Date(event?.createdAt ?? '').getTime();

  return Number.isNaN(createdAt) ? 0 : createdAt;
}
