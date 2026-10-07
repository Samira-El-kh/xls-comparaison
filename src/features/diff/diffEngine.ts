import type {
  CellValue,
  ColumnChanges,
  ComparisonConfig,
  ComparisonResult,
  ComparisonSummary,
  FieldDiff,
  FieldChangeSummary,
  MetadataEntry,
  RowDiff,
  ValidationResult,
} from '@/types';
import { computeNumericDiff, isNumeric, numbersEqual } from './numericDiff';
import { isEmpty, valuesEqual } from './stringDiff';

export interface EngineInput {
  headersA: string[];
  headersB: string[];
  rowsA: Record<string, CellValue>[];
  rowsB: Record<string, CellValue>[];
  keyColumn: string;
  config: ComparisonConfig;
  metadataA: MetadataEntry[];
  metadataB: MetadataEntry[];
}

export function compareWorkbooks(input: EngineInput): ComparisonResult {
  const { headersA, headersB, rowsA, rowsB, keyColumn, config, metadataA, metadataB } = input;

  const stringOpts = {
    ignoreWhitespace: config.ignoreWhitespace,
    treatEmptyAsEqual: config.treatEmptyAsEqual,
    caseInsensitive: config.caseInsensitive,
  };

  // Build lookup maps
  const mapA = new Map<string, Record<string, CellValue>[]>();
  const mapB = new Map<string, Record<string, CellValue>[]>();

  for (const row of rowsA) {
    const key = extractKey(row, keyColumn);
    if (key === null) continue;
    const existing = mapA.get(key);
    if (existing) existing.push(row);
    else mapA.set(key, [row]);
  }
  for (const row of rowsB) {
    const key = extractKey(row, keyColumn);
    if (key === null) continue;
    const existing = mapB.get(key);
    if (existing) existing.push(row);
    else mapB.set(key, [row]);
  }

  // Validation
  const validation = validateKeys(rowsA, rowsB, keyColumn, mapA, mapB);

  // Column changes
  const columnChanges: ColumnChanges = {
    added: headersB.filter((h) => !headersA.includes(h)),
    removed: headersA.filter((h) => !headersB.includes(h)),
    common: headersA.filter((h) => headersB.includes(h)),
  };

  // All keys
  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()]);

  const allHeaders = uniqueHeaders(headersA, headersB);
  const rows: RowDiff[] = [];

  for (const key of allKeys) {
    const listA = mapA.get(key);
    const listB = mapB.get(key);
    const rowA = listA?.[0];
    const rowB = listB?.[0];

    if (rowA && rowB) {
      const fields = compareFields(rowA, rowB, allHeaders, config, stringOpts);
      const changedFields = fields.filter((f) => f.status === 'CHANGED');
      const status = changedFields.length > 0 ? 'CHANGED' : 'UNCHANGED';
      rows.push({
        key,
        status,
        fields,
        rowA,
        rowB,
        changedFieldCount: changedFields.length,
      });
    } else if (rowB && !rowA) {
      const fields: FieldDiff[] = allHeaders.map((field) => ({
        field,
        oldValue: undefined,
        newValue: rowB[field],
        status: 'ADDED',
      }));
      rows.push({
        key,
        status: 'ADDED',
        fields,
        rowB,
        changedFieldCount: fields.length,
      });
    } else if (rowA && !rowB) {
      const fields: FieldDiff[] = allHeaders.map((field) => ({
        field,
        oldValue: rowA[field],
        newValue: undefined,
        status: 'REMOVED',
      }));
      rows.push({
        key,
        status: 'REMOVED',
        fields,
        rowA,
        changedFieldCount: fields.length,
      });
    }
  }

  // Sort: changed first, then added, then removed, then unchanged
  const statusOrder: Record<string, number> = {
    CHANGED: 0,
    ADDED: 1,
    REMOVED: 2,
    UNCHANGED: 3,
  };
  rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.key.localeCompare(b.key));

  const summary: ComparisonSummary = {
    totalMatched: rows.filter((r) => r.status !== 'ADDED' && r.status !== 'REMOVED').length,
    changed: rows.filter((r) => r.status === 'CHANGED').length,
    added: rows.filter((r) => r.status === 'ADDED').length,
    removed: rows.filter((r) => r.status === 'REMOVED').length,
    unchanged: rows.filter((r) => r.status === 'UNCHANGED').length,
  };

  const metadataEntries = compareMetadata(metadataA, metadataB, stringOpts, config);

  return {
    rows,
    summary,
    columnChanges,
    metadataEntries,
    validation,
  };
}

function extractKey(row: Record<string, CellValue>, keyColumn: string): string | null {
  const val = row[keyColumn];
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim();
}

function compareFields(
  rowA: Record<string, CellValue>,
  rowB: Record<string, CellValue>,
  headers: string[],
  config: ComparisonConfig,
  stringOpts: {
    ignoreWhitespace: boolean;
    treatEmptyAsEqual: boolean;
    caseInsensitive: boolean;
  }
): FieldDiff[] {
  return headers.map((field) => {
    const oldVal = rowA[field];
    const newVal = rowB[field];
    const inA = field in rowA;
    const inB = field in rowB;

    if (!inA && inB) {
      return { field, oldValue: undefined, newValue: newVal, status: 'ADDED' as const };
    }
    if (inA && !inB) {
      return { field, oldValue: oldVal, newValue: undefined, status: 'REMOVED' as const };
    }

    const bothNumeric = isNumeric(oldVal) && isNumeric(newVal);
    let equal: boolean;

    if (bothNumeric) {
      equal = numbersEqual(oldVal, newVal, config.numericMode, config.tolerance);
    } else {
      equal = valuesEqual(oldVal, newVal, stringOpts);
    }

    if (equal) {
      return { field, oldValue: oldVal, newValue: newVal, status: 'UNCHANGED' as const };
    }

    const numericDiff =
      bothNumeric || (isNumeric(oldVal) && isNumeric(newVal))
        ? computeNumericDiff(oldVal, newVal) ?? undefined
        : undefined;

    return {
      field,
      oldValue: oldVal,
      newValue: newVal,
      status: 'CHANGED' as const,
      numericDiff,
    };
  });
}

function uniqueHeaders(headersA: string[], headersB: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const h of headersA) {
    if (!seen.has(h)) {
      seen.add(h);
      result.push(h);
    }
  }
  for (const h of headersB) {
    if (!seen.has(h)) {
      seen.add(h);
      result.push(h);
    }
  }
  return result;
}

function validateKeys(
  rowsA: Record<string, CellValue>[],
  rowsB: Record<string, CellValue>[],
  keyColumn: string,
  mapA: Map<string, Record<string, CellValue>[]>,
  mapB: Map<string, Record<string, CellValue>[]>
): ValidationResult {
  const duplicateKeysA: { key: string; count: number; rowIndices: number[] }[] = [];
  const duplicateKeysB: { key: string; count: number; rowIndices: number[] }[] = [];
  let emptyKeysA = 0;
  let emptyKeysB = 0;

  rowsA.forEach((row, idx) => {
    const val = row[keyColumn];
    if (isEmpty(val)) {
      emptyKeysA++;
    }
  });
  rowsB.forEach((row, idx) => {
    const val = row[keyColumn];
    if (isEmpty(val)) {
      emptyKeysB++;
    }
  });

  for (const [key, list] of mapA) {
    if (list.length > 1) {
      const indices: number[] = [];
      rowsA.forEach((row, idx) => {
        if (String(row[keyColumn] ?? '').trim() === key) indices.push(idx);
      });
      duplicateKeysA.push({ key, count: list.length, rowIndices: indices });
    }
  }
  for (const [key, list] of mapB) {
    if (list.length > 1) {
      const indices: number[] = [];
      rowsB.forEach((row, idx) => {
        if (String(row[keyColumn] ?? '').trim() === key) indices.push(idx);
      });
      duplicateKeysB.push({ key, count: list.length, rowIndices: indices });
    }
  }

  const keysA = new Set(mapA.keys());
  const keysB = new Set(mapB.keys());
  let keysOnlyInA = 0;
  let keysOnlyInB = 0;
  for (const k of keysA) if (!keysB.has(k)) keysOnlyInA++;
  for (const k of keysB) if (!keysA.has(k)) keysOnlyInB++;

  const uniqueMatched = [...keysA].filter((k) => keysB.has(k)).length;

  return {
    duplicateKeysA,
    duplicateKeysB,
    emptyKeysA,
    emptyKeysB,
    keysOnlyInA,
    keysOnlyInB,
    uniqueMatched,
    hasDuplicates: duplicateKeysA.length > 0 || duplicateKeysB.length > 0,
    hasEmptyKeys: emptyKeysA > 0 || emptyKeysB > 0,
    hasUnmatched: keysOnlyInA > 0 || keysOnlyInB > 0,
  };
}

function compareMetadata(
  metadataA: MetadataEntry[],
  metadataB: MetadataEntry[],
  stringOpts: {
    ignoreWhitespace: boolean;
    treatEmptyAsEqual: boolean;
    caseInsensitive: boolean;
  },
  config: ComparisonConfig
): MetadataEntry[] {
  const mapB = new Map(metadataB.map((m) => [m.key, m]));
  const result: MetadataEntry[] = [];

  for (const entryA of metadataA) {
    const entryB = mapB.get(entryA.key);
    if (entryB) {
      const bothNumeric = isNumeric(entryA.valueA) && isNumeric(entryB.valueA);
      const equal = bothNumeric
        ? numbersEqual(entryA.valueA, entryB.valueA, config.numericMode, config.tolerance)
        : valuesEqual(entryA.valueA, entryB.valueA, stringOpts);
      result.push({
        key: entryA.key,
        label: entryA.label,
        valueA: entryA.valueA,
        valueB: entryB.valueA,
      });
      void equal;
    } else {
      result.push({
        key: entryA.key,
        label: entryA.label,
        valueA: entryA.valueA,
        valueB: undefined,
      });
    }
  }

  for (const entryB of metadataB) {
    if (!metadataA.find((m) => m.key === entryB.key)) {
      result.push({
        key: entryB.key,
        label: entryB.label,
        valueA: undefined,
        valueB: entryB.valueA,
      });
    }
  }

  return result;
}

export function buildFieldChangeSummaries(result: ComparisonResult): FieldChangeSummary[] {
  const fieldMap = new Map<string, FieldChangeSummary>();

  for (const row of result.rows) {
    if (row.status !== 'CHANGED') continue;
    for (const field of row.fields) {
      if (field.status !== 'CHANGED') continue;
      let summary = fieldMap.get(field.field);
      if (!summary) {
        summary = { field: field.field, changeCount: 0, changes: [] };
        fieldMap.set(field.field, summary);
      }
      summary.changeCount++;
      summary.changes.push({
        key: row.key,
        oldValue: field.oldValue,
        newValue: field.newValue,
        absolute: field.numericDiff?.absolute ?? 0,
        percentage: field.numericDiff?.percentage ?? null,
      });
    }
  }

  return Array.from(fieldMap.values()).sort((a, b) => b.changeCount - a.changeCount);
}
