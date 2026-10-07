import type { CellValue } from '@/types';

/**
 * Detect the most likely header row in a sheet's raw 2D array.
 * A header row is typically a row where:
 * - Most cells are non-empty strings
 * - The row has at least 2 non-empty cells
 * - Subsequent rows have data in those columns
 *
 * If detection is ambiguous, returns 0 (assume first row is header).
 */
export function detectHeaderRow(rows: CellValue[][]): number {
  if (rows.length === 0) return 0;

  const maxScan = Math.min(rows.length, 30);

  let bestRow = 0;
  let bestScore = -1;

  for (let i = 0; i < maxScan; i++) {
    const row = rows[i];
    if (!row) continue;

    const nonEmpty = row.filter((c) => c !== null && c !== undefined && c !== '');
    if (nonEmpty.length < 2) continue;

    const stringCells = nonEmpty.filter(
      (c) => typeof c === 'string' || (typeof c === 'number' && !Number.isFinite(Number(c)))
    );
    const allStrings = nonEmpty.every((c) => typeof c === 'string');
    const numericCells = nonEmpty.filter((c) => typeof c === 'number');

    // Header rows should be mostly strings
    let score = 0;
    score += stringCells.length * 2;
    if (allStrings) score += nonEmpty.length;
    score += Math.min(nonEmpty.length, 20); // wider rows score higher
    score -= numericCells.length * 3; // numeric-heavy rows are likely data

    // Check that following rows have data in the same columns
    if (i + 1 < rows.length) {
      const nextRow = rows[i + 1];
      if (nextRow) {
        const nextNonEmpty = nextRow.filter(
          (c) => c !== null && c !== undefined && c !== ''
        ).length;
        if (nextNonEmpty >= nonEmpty.length * 0.5) {
          score += 10; // looks like data follows
        }
      }
    }

    // Penalize rows with only 1-2 cells (likely metadata)
    if (nonEmpty.length <= 2 && i > 0) {
      score -= 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }

  return bestRow;
}
