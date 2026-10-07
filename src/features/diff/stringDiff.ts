import type { CellValue } from '@/types';

export function normalizeValue(
  value: CellValue,
  options: {
    ignoreWhitespace: boolean;
    treatEmptyAsEqual: boolean;
    caseInsensitive: boolean;
  }
): string {
  if (value === null || value === undefined) {
    return options.treatEmptyAsEqual ? '' : '\x00_NULL_';
  }
  if (value === '') {
    return options.treatEmptyAsEqual ? '' : '\x00_EMPTY_';
  }

  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'number') {
    str = String(value);
  } else if (typeof value === 'boolean') {
    str = String(value);
  } else {
    str = String(value);
  }

  if (options.ignoreWhitespace) {
    str = str.trim().replace(/\s+/g, ' ');
  }
  if (options.caseInsensitive) {
    str = str.toLowerCase();
  }
  return str;
}

export function valuesEqual(
  oldVal: CellValue,
  newVal: CellValue,
  options: {
    ignoreWhitespace: boolean;
    treatEmptyAsEqual: boolean;
    caseInsensitive: boolean;
  }
): boolean {
  return normalizeValue(oldVal, options) === normalizeValue(newVal, options);
}

export function isEmpty(value: CellValue): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '')
  );
}
