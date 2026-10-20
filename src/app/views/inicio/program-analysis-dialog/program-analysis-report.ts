/** Presentation-only snapshot. Values are supplied by the existing dashboard calculations. */
export type ReportValue = number | string | null | undefined;
export interface ReportMetric { label: string; value: ReportValue; }
export interface ProgramReport {
  id: number;
  name: string;
  active: ReportValue;
  entered: ReportValue;
  closed: ReportValue;
  red: ReportValue;
  withoutCitation: ReportValue;
  withoutFeedback: ReportValue;
  operational: ReportMetric[];
  monthly: { label: string; entered: ReportValue; closed: ReportValue; future: boolean; selected: boolean }[];
  annualEntered: ReportValue;
  annualClosed: ReportValue;
  results: ReportMetric[];
  references: ReportMetric[];
  complementary: ReportMetric[];
}
export interface ExecutiveReport {
  year: number;
  period: string;
  emittedAt: string;
  updatedAt: string;
  logoUrl: string;
  consolidated: boolean;
  summary: ReportMetric[];
  programs: ProgramReport[];
}

const institutionalNote = 'La información presentada corresponde a los registros disponibles en el sistema Gestión de Demanda para el período seleccionado. Los indicadores operativos actuales se identifican separadamente de los movimientos históricos. El presente informe tiene carácter descriptivo y no constituye una evaluación de desempeño.';
const escape = (value: unknown): string => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
function value(value: ReportValue): string {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value))) return '—';
  return escape(typeof value === 'number' ? new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value) : value);
}
function metrics(items: ReportMetric[], columns = 3): string {
  return `<dl class="metrics columns-${columns}">${items.map(item => `<div><dt>${escape(item.label)}</dt><dd>${value(item.value)}</dd></div>`).join('')}</dl>`;
}
function section(title: string, content: string): string {
  return `<section><h2>${escape(title)}</h2>${content}</section>`;
}
function header(report: ExecutiveReport, name?: string): string {
  return `<header><img src="${escape(report.logoUrl)}" alt="Servicio de Salud Magallanes"><div><p class="institution">Servicio de Salud Magallanes · Departamento de Salud Mental</p><h1>CONTROL EJECUTIVO DE DEMANDA</h1><p class="subtitle">${name ? 'Ficha de programa' : 'Informe consolidado de programas'}</p></div></header>
    ${name ? `<h2 class="program-name">${escape(name)}</h2>` : ''}
    <div class="metadata"><span>Período: <strong>${escape(report.period)}</strong></span><span>Emisión: ${escape(report.emittedAt)}</span><span>Corte operativo: ${escape(report.updatedAt)}</span></div>`;
}

export function buildExecutiveReport(report: ExecutiveReport): string {
  const sheets: string[] = [];
  if (report.consolidated) {
    sheets.push(`<article class="sheet" data-report-sheet="summary">${header(report)}
      ${section('Resumen general', metrics(report.summary))}
      ${section('Consolidado por programa', `<table class="consolidated"><thead><tr><th>Programa</th><th>Activas</th><th>Ingresadas</th><th>Cerradas</th><th>Rojos</th><th>Sin C1</th><th>Sin retroalimentación</th></tr></thead><tbody>${report.programs.map(p => `<tr><th scope="row">${escape(p.name)}</th><td>${value(p.active)}</td><td>${value(p.entered)}</td><td>${value(p.closed)}</td><td>${value(p.red)}</td><td>${value(p.withoutCitation)}</td><td>${value(p.withoutFeedback)}</td></tr>`).join('')}</tbody></table>`)}
      <p class="note">Ingresadas y cerradas corresponden al período seleccionado; cerradas significa episodios finalizados definitivamente. Activas, rojos, sin primera citación y sin retroalimentación corresponden a la situación actual, no a una reconstrucción histórica.</p>
      <p class="note">—: información no disponible. Casos críticos: casos rojos actuales. Las etapas cerradas representan gestiones, no episodios distintos.</p>
      <aside>${institutionalNote}</aside></article>`);
  }
  for (const p of report.programs) {
    const monthly = `<table class="monthly"><thead><tr><th>Mes</th>${p.monthly.map(m => `<th${m.selected ? ' class="selected"' : ''}>${escape(m.label)}${m.selected ? '*' : ''}</th>`).join('')}<th>Total anual</th></tr></thead><tbody>${(['entered', 'closed'] as const).map(kind => `<tr><th scope="row">${kind === 'entered' ? 'Ingresadas' : 'Cerradas'}</th>${p.monthly.map(m => `<td${m.selected ? ' class="selected"' : ''}>${m.future ? 'Fut.' : value(m[kind])}</td>`).join('')}<td>${value(kind === 'entered' ? p.annualEntered : p.annualClosed)}</td></tr>`).join('')}</tbody></table><p class="caption">Contexto anual ${report.year}. * Mes seleccionado. Fut.: mes futuro. Cerradas: episodios finalizados definitivamente.</p>`;
    sheets.push(`<article class="sheet" data-report-sheet="program" data-program-id="${p.id}">${header(report, p.name)}
      ${section('1. Resumen ejecutivo', metrics([
        { label: 'Demandas activas · actuales', value: p.active }, { label: 'Casos críticos · rojos actuales', value: p.red },
        { label: 'Demandas ingresadas · período', value: p.entered }, { label: 'Cierres definitivos · período', value: p.closed },
        { label: 'Sin primera citación · actual', value: p.withoutCitation }, { label: 'Sin retroalimentación · actual', value: p.withoutFeedback },
      ]))}
      ${section('2. Indicadores operativos · actuales', metrics(p.operational))}
      ${section('3. Seguimiento mensual · episodios', monthly)}
      ${section('4. Resultados de gestión · etapas del período', metrics(p.results))}
      <p class="caption">La referencia cierra la etapa del programa, pero no necesariamente el episodio global. Las otras causales registradas también se incluyen en el total.</p>
      ${section('5. Referencias · período seleccionado', metrics(p.references, 4))}
      <div class="closing-block">${section('6. Información operativa complementaria · actual', metrics(p.complementary))}
      <p class="caption">—: información no disponible para este programa. No se distribuyen promedios ni totales globales entre programas.</p>
      <aside>${institutionalNote}</aside></div></article>`);
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Control Ejecutivo de Demanda · Informe institucional</title><style>
    @page { size: Letter portrait; margin: 12mm 12mm 16mm; @bottom-left { content: "Servicio de Salud Magallanes · Gestión de Demanda"; font: 8pt Arial; color: #526a77; } @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8pt Arial; color: #526a77; } }
    * { box-sizing: border-box; } body { margin: 0; color: #263940; font: 10pt/1.25 Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet + .sheet { break-before: page; } header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #087f91; padding-bottom: 9px; margin-bottom: 8px; }
    header img { width: 70px; max-height: 60px; object-fit: contain; } header div { min-width: 0; } h1 { font-size: 16pt; line-height: 1.15; margin: 4px 0; color: #086a79; }
    .institution { font-size: 9pt; margin: 0; } .subtitle { font-size: 12pt; margin: 0; } .program-name { font-size: 14pt; overflow-wrap: anywhere; margin: 8px 0; color: #075b68; }
    .metadata { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 8.5pt; color: #526a77; margin-bottom: 10px; }
    section { margin: 5px 0; } h2 { font-size: 10.5pt; color: #08778a; border-bottom: 1px solid #cbdfe6; padding-bottom: 3px; margin: 0 0 5px; break-after: avoid; }
    .closing-block { break-inside: avoid; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; gap: 4px; break-inside: avoid; }
    .metrics.columns-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .metrics > div { border: 1px solid #dce7eb; background: #f4f9fa; padding: 4px 7px; break-inside: avoid; overflow-wrap: anywhere; }
    dt { font-size: 8.5pt; color: #526a77; } dd { margin: 2px 0 0; font-size: 11pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; } thead { display: table-header-group; } tr { break-inside: avoid; }
    th, td { border: 1px solid #d5e3e9; padding: 5px 4px; text-align: center; overflow-wrap: anywhere; } th { background: #e8f3f6; font-weight: 600; }
    .consolidated { font-size: 8.5pt; } .consolidated th:first-child { width: 29%; text-align: left; } .consolidated tbody th { background: #f8fbfc; }
    .monthly { font-size: 8pt; } .monthly th, .monthly td { padding: 4px 1px; } .monthly th:first-child { width: 14%; text-align: left; } .monthly th:last-child { width: 9%; } .selected { background: #e4f2f6; }
    .caption { font-size: 8pt; color: #526a77; margin: 4px 0; } .note { font-size: 9pt; margin: 10px 0; } aside { border-left: 3px solid #087f91; padding: 6px 10px; margin-top: 6px; background: #f4f9fa; font-size: 8.5pt; break-inside: avoid; }
    @media screen { body { max-width: 191.9mm; margin: 12mm auto; } .sheet { margin-bottom: 24px; } }
    </style></head><body>${sheets.join('')}</body></html>`;
}
