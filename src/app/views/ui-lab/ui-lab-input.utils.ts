// Experimental only: no application forms or API contracts depend on these helpers.
export function normalizeRut(value: string): string {
  return value.trim().replace(/[.\s-]/g, '').toUpperCase();
}

export function validateRut(value: string): boolean {
  const rut = normalizeRut(value);
  if (!/^[1-9]\d{0,7}[\dK]$/.test(rut)) return false;
  const body = rut.slice(0, -1);
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - sum % 11;
  const digit = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return rut.slice(-1) === digit;
}

export function formatRut(value: string): string {
  const rut = normalizeRut(value);
  if (!/^\d{1,8}[\dK]$/.test(rut)) return value.trim();
  return rut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + rut.slice(-1);
}

export function normalizeDate(value: string): string {
  const text = value.trim();
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  return parts ? parts[1].padStart(2, '0') + parts[2].padStart(2, '0') + parts[3] : text;
}

export function validateDate(value: string): boolean {
  const date = normalizeDate(value);
  if (!/^\d{8}$/.test(date)) return false;
  const day = Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4));
  const year = Number(date.slice(4));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function formatDate(value: string): string {
  if (!validateDate(value)) return value.trim();
  const date = normalizeDate(value);
  return `${date.slice(0, 2)}/${date.slice(2, 4)}/${date.slice(4)}`;
}

export function toApiDate(value: string): string | null {
  if (!validateDate(value)) return null;
  const date = normalizeDate(value);
  return `${date.slice(4)}-${date.slice(2, 4)}-${date.slice(0, 2)}`;
}

export function normalizeTime(value: string): string {
  const text = value.trim();
  const parts = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (parts) return parts[1].padStart(2, '0') + parts[2];
  return /^\d{3,4}$/.test(text) ? text.padStart(4, '0') : text;
}

export function validateTime(value: string): boolean {
  const time = normalizeTime(value);
  return /^\d{4}$/.test(time) && Number(time.slice(0, 2)) < 24 && Number(time.slice(2)) < 60;
}

export function formatTime(value: string): string {
  if (!validateTime(value)) return value.trim();
  const time = normalizeTime(value);
  return `${time.slice(0, 2)}:${time.slice(2)}`;
}
