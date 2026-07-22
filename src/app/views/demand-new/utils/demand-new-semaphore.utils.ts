import { normalizeSemaphoreColor } from './demand-new-event.utils';

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