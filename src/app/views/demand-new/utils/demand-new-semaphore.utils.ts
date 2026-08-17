import { normalizeSemaphoreColor } from './demand-new-event.utils';

export type DemandSemaphoreColor =
  | 'VERDE'
  | 'AMARILLO'
  | 'ROJO';

export const DEMAND_SEMAPHORE_LIMITS = {
  greenMaxDays: 45,
  yellowMaxDays: 90,
} as const;

export const DEMAND_SEMAPHORE_RANGE_TEXT =
  'Verde 0 a 45 días · Amarillo 46 a 90 días · Rojo 91 días o más';

export function getSemaphoreColorFromDays(
  value: number | string | null | undefined,
): DemandSemaphoreColor | null {
  const days = Number(value);

  if (!Number.isFinite(days) || days < 0) {
    return null;
  }

  if (days <= DEMAND_SEMAPHORE_LIMITS.greenMaxDays) {
    return 'VERDE';
  }

  if (days <= DEMAND_SEMAPHORE_LIMITS.yellowMaxDays) {
    return 'AMARILLO';
  }

  return 'ROJO';
}

export function getSemaphoreCssClass(
  value: string | null | undefined,
): string {
  const color = normalizeSemaphoreColor(value);

  if (color === 'ROJO') {
    return 'semaphore-red';
  }

  if (color === 'AMARILLO') {
    return 'semaphore-yellow';
  }

  if (color === 'VERDE') {
    return 'semaphore-green';
  }

  return 'semaphore-empty';
}

export function getSemaphoreCssClassFromDays(
  value: number | string | null | undefined,
): string {
  return getSemaphoreCssClass(
    getSemaphoreColorFromDays(value),
  );
}

export function getSemaphoreDescriptionText(
  value: string | null | undefined,
): string {
  const color = normalizeSemaphoreColor(value);

  if (color === 'ROJO') {
    return 'Atención prioritaria';
  }

  if (color === 'AMARILLO') {
    return 'Seguimiento preventivo';
  }

  if (color === 'VERDE') {
    return 'Dentro de plazo';
  }

  return 'Sin clasificación';
}

export function getSemaphoreDescriptionFromDays(
  value: number | string | null | undefined,
): string {
  return getSemaphoreDescriptionText(
    getSemaphoreColorFromDays(value),
  );
}