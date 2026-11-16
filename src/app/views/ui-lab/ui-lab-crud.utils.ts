export interface LabRecord {
  id: number; code: string; name: string; rut: string; program: string;
  date: string; state: string; responsible: string; count: number;
}
export type LabSortKey = Exclude<keyof LabRecord, 'id'>;
export interface LabQuery { search: string; state: string; program: string; sortKey: LabSortKey | ''; direction: 'asc' | 'desc' | ''; page: number; pageSize: number; }
const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export function queryLabRecords(records: LabRecord[], query: LabQuery) {
  const search = searchText(query.search.trim());
  const rutSearch = search.replace(/[.\s-]/g, '');
  const result = records.filter(row => (!query.state || row.state === query.state) && (!query.program || row.program === query.program) &&
    (!search || [row.name, row.code, row.rut].some(value => searchText(value).includes(search)) || (rutSearch && row.rut.replace(/[.\s-]/g, '').toLowerCase().includes(rutSearch))));
  if (query.sortKey && query.direction) {
    const key = query.sortKey;
    const factor = query.direction === 'asc' ? 1 : -1;
    result.sort((a, b) => factor * (typeof a[key] === 'number' ? Number(a[key]) - Number(b[key]) : String(a[key]).localeCompare(String(b[key]), 'es', {numeric: true})) || a.id - b.id);
  }
  const size = Math.max(1, Math.floor(query.pageSize) || 10);
  const pages = Math.max(1, Math.ceil(result.length / size));
  const page = Math.min(pages, Math.max(1, Math.floor(query.page) || 1));
  const start = result.length ? (page - 1) * size + 1 : 0;
  return {total: result.length, pages, page, start, end: Math.min(page * size, result.length), rows: result.slice((page - 1) * size, page * size)};
}
export function makeLabRecords(): LabRecord[] {
  return Array.from({length: 48}, (_, index) => ({id: index + 1, code: `LAB-${String(index + 1).padStart(3, '0')}`,
    name: `Persona de ejemplo ${String(index + 1).padStart(2, '0')}`, rut: '12.345.678-5',
    program: ['Programa Norte', 'Programa Sur', 'Programa de acompañamiento comunitario'][index % 3],
    date: `2026-10-${String(index % 28 + 1).padStart(2, '0')}`, state: ['Activo', 'Pendiente', 'Cerrado'][index % 3],
    responsible: `Profesional ${index % 4 + 1}`, count: index % 17}));
}
