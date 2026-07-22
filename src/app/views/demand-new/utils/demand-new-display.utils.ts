export function formatDisplayDate(value: any): string {
  if (!value) {
    return 'Sin fecha';
  }

  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();

    return `${day}/${month}/${year}`;
  }

  const text = String(value).trim();

  if (!text) {
    return 'Sin fecha';
  }

  const onlyDate = text.slice(0, 10);
  const parts = onlyDate.split('-');

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return text;
}

export function formatDisplayTime(value: any): string {
  if (!value) {
    return 'Sin hora';
  }

  return String(value).trim().slice(0, 5);
}