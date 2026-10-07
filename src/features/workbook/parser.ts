import * as XLSX from 'xlsx';
import type { CellValue, ParsedSheet, ParsedWorkbook, MetadataEntry } from '@/types';
import { detectHeaderRow } from '../workbook/detector';

export interface ParseResult {
  workbook: ParsedWorkbook;
  error?: string;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

    const sheets: ParsedSheet[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const sheet = parseSheet(ws, sheetName);
      sheets.push(sheet);
    }

    return {
      workbook: {
        fileName: file.name,
        fileSize: file.size,
        sheets,
        rawWorkbook: wb,
      },
    };
  } catch {
    return {
      workbook: {
        fileName: file.name,
        fileSize: file.size,
        sheets: [],
        rawWorkbook: null,
      },
      error: 'Unable to read this file. It may not be a valid Excel workbook.',
    };
  }
}

function parseSheet(ws: XLSX.WorkSheet, name: string): ParsedSheet {
  const rawRows = XLSX.utils.sheet_to_json<CellValue[]>(ws, {
    header: 1,
    raw: true,
    dateNF: 'yyyy-mm-dd',
    blankrows: true,
    defval: null,
  });

  const totalRows = rawRows.length;
  const headerRowIndex = detectHeaderRow(rawRows);

  const metadata: MetadataEntry[] = [];
  // Extract metadata (rows before header that look like key-value pairs)
  for (let i = 0; i < headerRowIndex && i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && c !== '');
    if (nonEmpty.length >= 1 && nonEmpty.length <= 3) {
      const key = String(row[0] ?? '').trim();
      const value = row[1] ?? row[0];
      if (key) {
        metadata.push({ key, label: key, valueA: value, valueB: value });
      }
    }
  }

  // Extract headers and data rows
  const headerRow = rawRows[headerRowIndex] ?? [];
  const headers = headerRow
    .map((h, idx) => {
      if (h === null || h === undefined || h === '') return `Column ${idx + 1}`;
      return String(h).trim();
    })
    .filter((h, _idx, _arr) => {
      // Keep headers that aren't all empty
      return h !== '';
    });

  // Build full header list including positional placeholders
  const fullHeaders: string[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const raw = headerRow[i];
    let h: string;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      h = `Column ${i + 1}`;
    } else {
      h = String(raw).trim();
    }
    // Deduplicate
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    fullHeaders.push(count > 0 ? `${h} (${count + 1})` : h);
  }

  const rows: Record<string, CellValue>[] = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    if (!rawRow) continue;
    // Skip fully empty rows
    if (rawRow.every((c) => c === null || c === undefined || c === '')) continue;

    const rowObj: Record<string, CellValue> = {};
    for (let j = 0; j < fullHeaders.length; j++) {
      rowObj[fullHeaders[j]] = (rawRow[j] ?? null) as CellValue;
    }
    rows.push(rowObj);
  }

  return {
    name,
    headers: fullHeaders,
    rows,
    metadata,
    detectedHeaderRowIndex: headerRowIndex,
    totalRows,
  };
}
