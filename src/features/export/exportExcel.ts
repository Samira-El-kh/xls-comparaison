import * as XLSX from 'xlsx';
import type { ComparisonResult, CellValue } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  CHANGED: 'FFFFF3CD',
  ADDED: 'FFD4EDDA',
  REMOVED: 'FFF8D7DA',
  UNCHANGED: 'FFFFFFFF',
};

function cellVal(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toLocaleDateString();
  return String(v);
}

export function exportDiffToExcel(result: ComparisonResult, fileNameA: string, fileNameB: string) {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──────────────────────────────────────────────
  const summaryData = [
    ['XLS Diff — Comparison Report'],
    ['Generated', new Date().toLocaleString()],
    ['File A', fileNameA],
    ['File B', fileNameB],
    [],
    ['Metric', 'Count'],
    ['Total Matched', result.summary.totalMatched],
    ['Changed', result.summary.changed],
    ['Added', result.summary.added],
    ['Removed', result.summary.removed],
    ['Unchanged', result.summary.unchanged],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // ── Diff sheet ─────────────────────────────────────────────────
  const changedRows = result.rows.filter((r) => r.status !== 'UNCHANGED');
  if (changedRows.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No differences found']]), 'Diff');
    XLSX.writeFile(wb, `diff-report-${Date.now()}.xlsx`);
    return;
  }

  // Collect all fields that actually changed
  const changedFields = Array.from(
    new Set(
      changedRows.flatMap((r) =>
        r.fields.filter((f) => f.status !== 'UNCHANGED').map((f) => f.field)
      )
    )
  );

  const headers = ['Status', 'Key', ...changedFields.flatMap((f) => [`${f} (A)`, `${f} (B)`, `${f} Δ`])];
  const rows = changedRows.map((row) => {
    const cells: (string | number)[] = [row.status, row.key];
    for (const field of changedFields) {
      const fd = row.fields.find((f) => f.field === field);
      cells.push(cellVal(fd?.oldValue));
      cells.push(cellVal(fd?.newValue));
      if (fd?.numericDiff) {
        const abs = fd.numericDiff.absolute;
        const pct = fd.numericDiff.percentage;
        cells.push(pct !== null ? `${abs >= 0 ? '+' : ''}${abs.toFixed(4)} (${pct.toFixed(2)}%)` : `${abs >= 0 ? '+' : ''}${abs.toFixed(4)}`);
      } else if (fd?.dateFormatOnly) {
        cells.push('Date format only');
      } else {
        cells.push('');
      }
    }
    return cells;
  });

  const diffSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Color rows by status
  rows.forEach((row, i) => {
    const status = row[0] as string;
    const fill = STATUS_COLORS[status] ?? STATUS_COLORS.UNCHANGED;
    const rowIdx = i + 1; // 0-indexed, +1 for header
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
      if (!diffSheet[cellRef]) diffSheet[cellRef] = { t: 's', v: '' };
      diffSheet[cellRef].s = { fill: { fgColor: { rgb: fill } } };
    }
  });

  diffSheet['!cols'] = [{ wch: 12 }, { wch: 20 }, ...changedFields.flatMap(() => [{ wch: 18 }, { wch: 18 }, { wch: 16 }])];
  XLSX.utils.book_append_sheet(wb, diffSheet, 'Diff');

  // ── Metadata sheet ─────────────────────────────────────────────
  if (result.metadataEntries.length > 0) {
    const metaRows = [
      ['Field', 'File A', 'File B'],
      ...result.metadataEntries.map((m) => [m.label || m.key, cellVal(m.valueA), cellVal(m.valueB)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaRows), 'Index Summary');
  }

  XLSX.writeFile(wb, `diff-report-${Date.now()}.xlsx`);
}
