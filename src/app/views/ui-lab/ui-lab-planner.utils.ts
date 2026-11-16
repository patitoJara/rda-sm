export interface LabPlanField {
  label: string;
  content: number;
  padding: number;
  border: number;
  icon: number;
  minimum: number;
  value: string;
}

export function fieldWidth(field: LabPlanField): number {
  return Math.max(field.minimum, field.content + field.padding + field.border + field.icon);
}

/** Local design aid: preserve comfortable widths and order; never stretch to fill. */
export function planRows(fields: LabPlanField[], available: number, gap: number) {
  const width = Math.max(0, available);
  const spacing = Math.max(0, gap);
  const total = fields.reduce((sum, field) => sum + fieldWidth(field), 0) + Math.max(0, fields.length - 1) * spacing;
  const rows: LabPlanField[][] = [];
  let used = 0;
  for (const field of fields) {
    const next = fieldWidth(field);
    if (!rows.length || (used > 0 && used + spacing + next > width)) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push(field);
    used += (used ? spacing : 0) + next;
  }
  return { total, remaining: width - total, fits: total <= width, rows,
    tooNarrow: fields.some(field => field.minimum > width) };
}
