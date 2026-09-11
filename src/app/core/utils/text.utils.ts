/* =========================================================
 * 🧩 UTILIDADES DE TEXTO – USO TRANSVERSAL
 * ========================================================= */

/*
    //--------------------------------------------------
                Función	Úsala para
    //--------------------------------------------------
    capitalizeWords	    nombres, profesionales
    formatPersonName	formularios personas
    formatTitle	        títulos, encabezados
    normalizeSpaces	    input de formularios
    removeAccents	    búsquedas
    toSlug	            URLs, claves
    truncate	        tablas, cards
    sanitizeForPrint	PDF / impresión
    safeText	        evitar null en UI
    withDefault	        textos opcionales
    //--------------------------------------------------
*/

/**
 * Capitaliza la primera letra de cada palabra
 * "juan pablo a" → "Juan Pablo A"
 */
export function capitalizeWords(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Capitaliza solo la primera letra del texto
 * "hola mundo" → "Hola mundo"
 */
export function capitalizeFirst(text: string): string {
  if (!text) return '';
  const t = text.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Convierte a MAYÚSCULAS
 */
export function toUpper(text: string): string {
  return text ? text.toUpperCase().trim() : '';
}

/**
 * Convierte a minúsculas
 */
export function toLower(text: string): string {
  return text ? text.toLowerCase().trim() : '';
}

/**
 * Elimina espacios extras entre palabras
 * "  juan   pablo  " → "juan pablo"
 */
export function normalizeSpaces(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Capitaliza nombres propios (ideal para personas)
 * Incluye limpieza + capitalización
 */
export function formatPersonName(text: string): string {
  if (!text) return '';

  /*
   * Normalización institucional de nombres de personas.
   *
   * - Elimina espacios duplicados.
   * - Convierte primero todo a minúsculas.
   * - Capitaliza cada palabra.
   * - Respeta letras Unicode: Á, É, Í, Ó, Ú, Ü, Ñ.
   * - Capitaliza correctamente después de guiones y apóstrofes.
   *
   * Ejemplos:
   *   "mARÍA  jOSÉ" -> "María José"
   *   "maría-josé"  -> "María-José"
   *   "o'higgins"   -> "O'Higgins"
   */
  return normalizeSpaces(text)
    .toLocaleLowerCase('es-CL')
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, separator: string, letter: string) =>
        separator + letter.toLocaleUpperCase('es-CL'),
    );
}

/**
 * Capitaliza títulos (primera palabra en mayúscula)
 * "registro de demanda" → "Registro de demanda"
 */
export function formatTitle(text: string): string {
  return capitalizeFirst(normalizeSpaces(text));
}

/**
 * Convierte texto a slug (URLs, keys)
 * "Juan Pablo A" → "juan-pablo-a"
 */
export function toSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Elimina tildes
 * "Educación" → "Educacion"
 */
export function removeAccents(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Recorta texto con puntos suspensivos
 */
export function truncate(
  text: string,
  maxLength: number,
  suffix: string = '…'
): string {
  if (!text) return '';
  return text.length > maxLength
    ? text.slice(0, maxLength).trim() + suffix
    : text;
}

/**
 * Convierte null / undefined en string vacío
 */
export function safeText(text: any): string {
  return text === null || text === undefined ? '' : String(text);
}

/**
 * Devuelve texto por defecto si está vacío
 */
export function withDefault(
  text: string | null | undefined,
  defaultValue: string
): string {
  return text && text.trim() !== '' ? text : defaultValue;
}

/**
 * Detecta si el texto tiene contenido real
 */
export function hasText(text: string | null | undefined): boolean {
  return !!text && text.trim().length > 0;
}

/**
 * Convierte a texto limpio para impresión / PDF
 */
export function sanitizeForPrint(text: string): string {
  if (!text) return '';
  return normalizeSpaces(text.replace(/[\r\n]+/g, ' '));
}
