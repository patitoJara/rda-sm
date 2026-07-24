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

const RESULT_LABELS: Record<string, string> = {
  LISTA_ESPERA: 'Lista de espera',
  AUN_SIN_RESULTADO: 'Aún sin resultado',
  REFERENCIA: 'Referencia',
  INGRESO_TRATAMIENTO: 'Ingreso a tratamiento',
  EGRESO: 'Egreso',
  NO_ES_PERFIL: 'No es perfil',
  NO_CORRESPONDE: 'No corresponde',
  ABANDONO: 'Abandono',
};

export function formatResultLabel(
  value: unknown,
  fallback = 'Sin resultado',
): string {
  const code = String(value ?? '')
    .trim()
    .toUpperCase();

  if (!code) {
    return fallback;
  }

  const configuredLabel = RESULT_LABELS[code];

  if (configuredLabel) {
    return configuredLabel;
  }

  const normalized = code
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : fallback;
}