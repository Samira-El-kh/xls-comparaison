import type { CellValue } from '@/types';

// Date patterns: MM/DD/YYYY, DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY, etc.
const DATE_PATTERNS = [
  /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,   // MM/DD/YYYY or DD/MM/YYYY
  /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,             // DD.MM.YYYY
  /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,     // YYYY-MM-DD
];

export function tryParseDate(value: CellValue): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;
  const str = value.trim();

  // DD.MM.YYYY
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const d = new Date(+dotMatch[3], +dotMatch[2] - 1, +dotMatch[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  // MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = new Date(+slashMatch[3], +slashMatch[1] - 1, +slashMatch[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isDateString(value: CellValue): boolean {
  return tryParseDate(value) !== null;
}

export function toNumber(value: CellValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  // Don't parse date strings as numbers
  if (isDateString(value)) return null;
  const str = String(value).trim();
  if (str === '') return null;
  const cleaned = str.replace(/[, ]/g, '').replace(/[()%]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function isNumeric(value: CellValue): boolean {
  return toNumber(value) !== null;
}

export function formatNumber(value: CellValue, decimals = 4): string {
  const num = toNumber(value);
  if (num === null) return String(value ?? '');
  if (Number.isInteger(num) && Math.abs(num) < 1e15) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return num.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

export function computeNumericDiff(
  oldValue: CellValue,
  newValue: CellValue
): { absolute: number; percentage: number | null } | null {
  const oldNum = toNumber(oldValue);
  const newNum = toNumber(newValue);
  if (oldNum === null || newNum === null) return null;

  const absolute = newNum - oldNum;
  let percentage: number | null = null;

  if (oldNum !== 0) {
    percentage = ((newNum - oldNum) / Math.abs(oldNum)) * 100;
    if (!Number.isFinite(percentage)) percentage = null;
  }

  return { absolute, percentage };
}

export function formatDiff(absolute: number, decimals = 4): string {
  const sign = absolute > 0 ? '+' : '';
  return sign + absolute.toFixed(decimals).replace(/\.?0+$/, '');
}

export function formatPercentage(percentage: number | null, decimals = 4): string {
  if (percentage === null) return '—';
  const sign = percentage > 0 ? '+' : '';
  const rounded = percentage.toFixed(decimals).replace(/\.?0+$/, '');
  return sign + rounded + '%';
}

export function numbersEqual(
  oldVal: CellValue,
  newVal: CellValue,
  mode: 'exact' | 'display' | 'tolerance',
  tolerance: number
): boolean {
  const oldNum = toNumber(oldVal);
  const newNum = toNumber(newVal);
  if (oldNum === null && newNum === null) return true;
  if (oldNum === null || newNum === null) return false;

  if (mode === 'exact') {
    return oldNum === newNum;
  }
  if (mode === 'tolerance') {
    return Math.abs(newNum - oldNum) <= tolerance;
  }
  // display: compare as displayed (2 decimal string comparison is too aggressive)
  // compare with small floating point epsilon
  const diff = Math.abs(newNum - oldNum);
  const maxVal = Math.max(Math.abs(oldNum), Math.abs(newNum), 1);
  return diff / maxVal < 1e-10 || diff < 1e-12;
}
