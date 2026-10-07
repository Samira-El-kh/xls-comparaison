export type RowStatus = 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED';
export type FieldStatus = 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED';

export type CellValue = string | number | boolean | Date | null | undefined;

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, CellValue>[];
  metadata: MetadataEntry[];
  detectedHeaderRowIndex: number;
  totalRows: number;
}

export interface MetadataEntry {
  key: string;
  valueA: CellValue;
  valueB: CellValue;
  label: string;
}

export interface ParsedWorkbook {
  fileName: string;
  fileSize: number;
  sheets: ParsedSheet[];
  rawWorkbook: unknown;
}

export interface ComparisonConfig {
  sheetA: string;
  sheetB: string;
  keyColumn: string;
  headerRowA: number;
  headerRowB: number;
  numericMode: 'exact' | 'display' | 'tolerance';
  tolerance: number;
  ignoreWhitespace: boolean;
  treatEmptyAsEqual: boolean;
  caseInsensitive: boolean;
}

export interface FieldDiff {
  field: string;
  oldValue: CellValue;
  newValue: CellValue;
  status: FieldStatus;
  numericDiff?: {
    absolute: number;
    percentage: number | null;
  };
}

export interface RowDiff {
  key: string;
  status: RowStatus;
  fields: FieldDiff[];
  rowA?: Record<string, CellValue>;
  rowB?: Record<string, CellValue>;
  changedFieldCount: number;
}

export interface ComparisonResult {
  rows: RowDiff[];
  summary: ComparisonSummary;
  columnChanges: ColumnChanges;
  metadataEntries: MetadataEntry[];
  validation: ValidationResult;
}

export interface ComparisonSummary {
  totalMatched: number;
  changed: number;
  added: number;
  removed: number;
  unchanged: number;
}

export interface ColumnChanges {
  added: string[];
  removed: string[];
  common: string[];
}

export interface ValidationResult {
  duplicateKeysA: { key: string; count: number; rowIndices: number[] }[];
  duplicateKeysB: { key: string; count: number; rowIndices: number[] }[];
  emptyKeysA: number;
  emptyKeysB: number;
  keysOnlyInA: number;
  keysOnlyInB: number;
  uniqueMatched: number;
  hasDuplicates: boolean;
  hasEmptyKeys: boolean;
  hasUnmatched: boolean;
}

export interface FieldChangeSummary {
  field: string;
  changeCount: number;
  changes: {
    key: string;
    oldValue: CellValue;
    newValue: CellValue;
    absolute: number;
    percentage: number | null;
  }[];
}

export type AppView = 'upload' | 'compare' | 'fields' | 'quality';
export type ThemeMode = 'light' | 'dark';
