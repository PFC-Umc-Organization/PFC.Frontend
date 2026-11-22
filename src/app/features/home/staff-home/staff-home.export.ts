import { Activity, PROJECT_STATUS_LABEL } from '../../../core/models';
import { CellState } from '../../../core/services/submission-status';
import { CELL_LABEL } from '../status-grid/status-grid.component';
import { Kpis, ConsolidatedRow } from './staff-home.kpis';

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

export interface ExportData {
  scope: string;
  filters: string[];
  kpis: Kpis;
  activities: Activity[];
  rows: ConsolidatedRow[];
  states: CellState[][];
}

export interface ExportTable {
  head: string[];
  body: string[][];
}

// Percentual
const pct = (value: number | null): string => (value === null ? '-' : `${Math.round(value)}%`);

// Data
const dayOf = (deadline: string): string => `${deadline.slice(8, 10)}/${deadline.slice(5, 7)}`;

// Tabela
export function exportTableOf(data: ExportData): ExportTable {
  return {
    head: [
      'Projeto',
      'Integrantes',
      'Turma',
      'Orientador',
      'Progresso',
      'Penalidades ativas',
      'Status',
      ...data.activities.map((a) => `${a.titulo} (${dayOf(a.prazo)})`),
    ],
    body: data.rows.map((r, i) => [
      r.name,
      r.members.join(', '),
      r.cohort,
      r.advisor,
      `${r.delivered}/${r.total}`,
      r.active === undefined ? '-' : String(r.active),
      r.status ? PROJECT_STATUS_LABEL[r.status] + (r.note ? `: ${r.note}` : '') : '-',
      ...(data.states[i] ?? []).map((s) => CELL_LABEL[s]),
    ]),
  };
}

// Resumo
export function kpiLinesOf(kpis: Kpis): string[] {
  const { outcome, bands, efficiency } = kpis;
  const lines: string[] = [];
  if (outcome.known) {
    lines.push(
      `Desfecho: aprovação ${pct(outcome.approved.pct)} (${outcome.approved.count}), em andamento ${pct(outcome.ongoing.pct)} (${outcome.ongoing.count}), reprovação ${pct(outcome.failed.pct)} (${outcome.failed.count}).`,
    );
  }
  if (bands.known) {
    const items = bands.items.map((b) => `${b.band === 3 ? '3 ou mais' : b.band}: ${b.count} (${pct(b.pct)})`).join('; ');
    lines.push(`Penalidades ativas por grupo - ${items}. Perdoadas no total: ${bands.waived}.`);
  }
  lines.push(
    `Entregas: concluídas sobre vencidas ${pct(efficiency.completedRate)}, atraso ou devolução ${pct(efficiency.issueRate)}` +
      (efficiency.bottleneck ? `, maior gargalo "${efficiency.bottleneck.title}" (${efficiency.bottleneck.count}).` : '.'),
  );
  return lines;
}

// Arquivo
function fileName(scope: string, extension: string): string {
  const slug = scope
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `entregas-por-projeto-${slug || 'turma'}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

// Excel
export async function exportExcel(data: ExportData): Promise<void> {
  const XLSX = await import('xlsx');
  const { head, body } = exportTableOf(data);
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Entregas por projeto'],
    ...data.filters.map((f) => [f]),
    [],
    head,
    ...body,
  ]);
  sheet['!cols'] = head.map((h, i) => ({ wch: i === 1 ? 40 : Math.max(14, Math.min(h.length + 2, 28)) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Entregas');
  XLSX.writeFile(book, fileName(data.scope, 'xlsx'));
}

// PDF
export async function exportPdf(data: ExportData): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const { head, body } = exportTableOf(data);
  const margin = 32;

  doc.setFontSize(14);
  doc.text('Entregas por projeto', margin, 36);
  doc.setFontSize(8);
  doc.setTextColor(90);
  const header = [...data.filters, ...kpiLinesOf(data.kpis)];
  const wrapped = header.flatMap((line) => doc.splitTextToSize(line, doc.internal.pageSize.getWidth() - margin * 2) as string[]);
  doc.text(wrapped, margin, 52);

  autoTable(doc, {
    head: [head],
    body,
    startY: 52 + wrapped.length * 10 + 8,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [38, 52, 120], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 245, 240] },
  });
  doc.save(fileName(data.scope, 'pdf'));
}
