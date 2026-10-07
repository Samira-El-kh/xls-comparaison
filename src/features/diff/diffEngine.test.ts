import { describe, it, expect } from 'vitest';
import { compareWorkbooks } from './diffEngine';
import { numbersEqual, computeNumericDiff, toNumber } from './numericDiff';
import { valuesEqual, isEmpty } from './stringDiff';
import type { CellValue, ComparisonConfig, MetadataEntry } from '@/types';

const defaultConfig: ComparisonConfig = {
  sheetA: 'Sheet1',
  sheetB: 'Sheet1',
  keyColumn: 'ISIN',
  headerRowA: 0,
  headerRowB: 0,
  numericMode: 'exact',
  tolerance: 0.000001,
  ignoreWhitespace: true,
  treatEmptyAsEqual: true,
  caseInsensitive: false,
};

function makeInput(
  headersA: string[],
  headersB: string[],
  rowsA: Record<string, CellValue>[],
  rowsB: Record<string, CellValue>[],
  overrides: Partial<ComparisonConfig> = {}
) {
  return {
    headersA,
    headersB,
    rowsA,
    rowsB,
    keyColumn: overrides.keyColumn ?? 'ISIN',
    config: { ...defaultConfig, ...overrides },
    metadataA: [] as MetadataEntry[],
    metadataB: [] as MetadataEntry[],
  };
}

describe('numericDiff', () => {
  it('compares exact numbers as equal', () => {
    expect(numbersEqual(100.11, 100.11, 'exact', 0)).toBe(true);
  });

  it('detects numeric changes', () => {
    expect(numbersEqual(100.11, 100.123, 'exact', 0)).toBe(false);
  });

  it('treats 100.11 and 100.110 as equal in display mode', () => {
    expect(numbersEqual(100.11, 100.11, 'display', 0)).toBe(true);
  });

  it('respects tolerance', () => {
    expect(numbersEqual(100.11, 100.1101, 'tolerance', 0.001)).toBe(true);
    expect(numbersEqual(100.11, 100.12, 'tolerance', 0.001)).toBe(false);
  });

  it('computes absolute difference', () => {
    const diff = computeNumericDiff(100.11, 100.123);
    expect(diff).not.toBeNull();
    expect(diff!.absolute).toBeCloseTo(0.013, 5);
  });

  it('computes percentage difference', () => {
    const diff = computeNumericDiff(100, 100.5);
    expect(diff!.percentage).toBeCloseTo(0.5, 2);
  });

  it('returns null percentage when old value is zero', () => {
    const diff = computeNumericDiff(0, 100);
    expect(diff!.absolute).toBe(100);
    expect(diff!.percentage).toBeNull();
  });

  it('handles null and empty values', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(Infinity)).toBeNull();
    expect(toNumber(NaN)).toBeNull();
  });

  it('parses numeric strings', () => {
    expect(toNumber('123.45')).toBe(123.45);
    expect(toNumber('1,234.56')).toBe(1234.56);
  });
});

describe('stringDiff', () => {
  it('detects changed text', () => {
    expect(valuesEqual('EUR', 'USD', { ignoreWhitespace: true, treatEmptyAsEqual: true, caseInsensitive: false })).toBe(false);
  });

  it('treats same text as equal', () => {
    expect(valuesEqual('EUR', 'EUR', { ignoreWhitespace: true, treatEmptyAsEqual: true, caseInsensitive: false })).toBe(true);
  });

  it('handles case insensitive comparison', () => {
    expect(valuesEqual('EUR', 'eur', { ignoreWhitespace: false, treatEmptyAsEqual: false, caseInsensitive: true })).toBe(true);
  });

  it('treats empty and null as equal when configured', () => {
    expect(valuesEqual(null, '', { ignoreWhitespace: true, treatEmptyAsEqual: true, caseInsensitive: false })).toBe(true);
  });

  it('distinguishes empty and null when not configured', () => {
    expect(valuesEqual(null, '', { ignoreWhitespace: false, treatEmptyAsEqual: false, caseInsensitive: false })).toBe(false);
  });

  it('ignores whitespace when configured', () => {
    expect(valuesEqual('  EUR  ', 'EUR', { ignoreWhitespace: true, treatEmptyAsEqual: false, caseInsensitive: false })).toBe(true);
  });

  it('detects empty values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty('value')).toBe(false);
  });
});

describe('diffEngine — row matching', () => {
  it('detects added rows', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Name'],
        ['ISIN', 'Name'],
        [{ ISIN: 'ABC123', Name: 'Old' }],
        [
          { ISIN: 'ABC123', Name: 'Old' },
          { ISIN: 'GHI789', Name: 'New Security' },
        ]
      )
    );
    expect(result.summary.added).toBe(1);
    expect(result.summary.unchanged).toBe(1);
    expect(result.rows.find((r) => r.key === 'GHI789')?.status).toBe('ADDED');
  });

  it('detects removed rows', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Name'],
        ['ISIN', 'Name'],
        [{ ISIN: 'XYZ789', Name: 'Old Security' }],
        []
      )
    );
    expect(result.summary.removed).toBe(1);
    expect(result.rows.find((r) => r.key === 'XYZ789')?.status).toBe('REMOVED');
  });

  it('detects changed rows', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Price'],
        ['ISIN', 'Price'],
        [{ ISIN: 'ABC123', Price: 100.11 }],
        [{ ISIN: 'ABC123', Price: 100.123 }]
      )
    );
    expect(result.summary.changed).toBe(1);
    const row = result.rows.find((r) => r.key === 'ABC123');
    expect(row?.status).toBe('CHANGED');
    expect(row?.changedFieldCount).toBe(1);
    const field = row?.fields.find((f) => f.field === 'Price');
    expect(field?.numericDiff?.absolute).toBeCloseTo(0.013, 5);
  });

  it('detects unchanged rows', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Price'],
        ['ISIN', 'Price'],
        [{ ISIN: 'ABC123', Price: 100.11 }],
        [{ ISIN: 'ABC123', Price: 100.11 }]
      )
    );
    expect(result.summary.unchanged).toBe(1);
    expect(result.summary.changed).toBe(0);
  });
});

describe('diffEngine — column changes', () => {
  it('detects added and removed columns', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'A', 'B', 'C'],
        ['ISIN', 'A', 'B', 'D'],
        [{ ISIN: 'X', A: 1, B: 2, C: 3 }],
        [{ ISIN: 'X', A: 1, B: 2, D: 4 }]
      )
    );
    expect(result.columnChanges.removed).toContain('C');
    expect(result.columnChanges.added).toContain('D');
    expect(result.columnChanges.common).toContain('A');
    expect(result.columnChanges.common).toContain('B');
  });
});

describe('diffEngine — validation', () => {
  it('detects duplicate keys', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN'],
        ['ISIN'],
        [
          { ISIN: 'DUP1' },
          { ISIN: 'DUP1' },
          { ISIN: 'ABC' },
        ],
        [{ ISIN: 'ABC' }]
      )
    );
    expect(result.validation.hasDuplicates).toBe(true);
    expect(result.validation.duplicateKeysA.length).toBe(1);
    expect(result.validation.duplicateKeysA[0].key).toBe('DUP1');
    expect(result.validation.duplicateKeysA[0].count).toBe(2);
  });

  it('detects empty keys', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN'],
        ['ISIN'],
        [{ ISIN: '' }, { ISIN: 'ABC' }],
        [{ ISIN: 'ABC' }]
      )
    );
    expect(result.validation.emptyKeysA).toBe(1);
    expect(result.validation.hasEmptyKeys).toBe(true);
  });

  it('reports unmatched keys', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN'],
        ['ISIN'],
        [{ ISIN: 'A' }, { ISIN: 'B' }, { ISIN: 'C' }],
        [{ ISIN: 'A' }, { ISIN: 'D' }]
      )
    );
    expect(result.validation.keysOnlyInA).toBe(2);
    expect(result.validation.keysOnlyInB).toBe(1);
    expect(result.validation.uniqueMatched).toBe(1);
  });
});

describe('diffEngine — numeric comparison modes', () => {
  it('recognizes 100.11 and 100.110 as equal in display mode', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Price'],
        ['ISIN', 'Price'],
        [{ ISIN: 'X', Price: 100.11 }],
        [{ ISIN: 'X', Price: 100.11 }]
      )
    );
    // In exact mode these should be equal (they're the same JS number)
    expect(result.summary.unchanged).toBe(1);
    expect(result.summary.changed).toBe(0);
  });

  it('uses tolerance correctly', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Price'],
        ['ISIN', 'Price'],
        [{ ISIN: 'X', Price: 100.11 }],
        [{ ISIN: 'X', Price: 100.1101 }]
      )
    );
    // Default tolerance is 0.000001, difference is 0.0001
    expect(result.summary.changed).toBe(1);

    const result2 = compareWorkbooks(
      makeInput(
        ['ISIN', 'Price'],
        ['ISIN', 'Price'],
        [{ ISIN: 'X', Price: 100.11 }],
        [{ ISIN: 'X', Price: 100.1101 }],
        { numericMode: 'tolerance', tolerance: 0.001 }
      )
    );
    expect(result2.summary.unchanged).toBe(1);
    expect(result2.summary.changed).toBe(0);
  });
});

describe('diffEngine — empty/null handling', () => {
  it('treats null and empty as equal when configured', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Currency'],
        ['ISIN', 'Currency'],
        [{ ISIN: 'X', Currency: null }],
        [{ ISIN: 'X', Currency: '' }]
      )
    );
    expect(result.summary.unchanged).toBe(1);
  });

  it('distinguishes null and empty when not configured', () => {
    const result = compareWorkbooks(
      makeInput(
        ['ISIN', 'Currency'],
        ['ISIN', 'Currency'],
        [{ ISIN: 'X', Currency: null }],
        [{ ISIN: 'X', Currency: '' }],
        { treatEmptyAsEqual: false }
      )
    );
    expect(result.summary.changed).toBe(1);
  });
});
