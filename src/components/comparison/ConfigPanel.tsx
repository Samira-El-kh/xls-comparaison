import { useMemo, useState, useEffect } from 'react';
import { Settings2, AlertTriangle, CheckCircle2, Play, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ComparisonConfig, CellValue } from '@/types';
import { isEmpty } from '@/features/diff/stringDiff';

export function ConfigPanel() {
  const workbookA = useStore((s) => s.workbookA)!;
  const workbookB = useStore((s) => s.workbookB)!;
  const runComparison = useStore((s) => s.runComparison);
  const setConfig = useStore((s) => s.setConfig);
  const existingConfig = useStore((s) => s.config);
  const ignoredColumns = useStore((s) => s.ignoredColumns);
  const setIgnoredColumns = useStore((s) => s.setIgnoredColumns);
  const columnTolerances = useStore((s) => s.columnTolerances);
  const setColumnTolerances = useStore((s) => s.setColumnTolerances);

  const [sheetA, setSheetA] = useState(existingConfig?.sheetA ?? workbookA.sheets[0]?.name ?? '');
  const [sheetB, setSheetB] = useState(existingConfig?.sheetB ?? workbookB.sheets[0]?.name ?? '');
  const [keyColumn, setKeyColumn] = useState(existingConfig?.keyColumn ?? '');
  const [headerRowA, setHeaderRowA] = useState(
    existingConfig?.headerRowA ?? workbookA.sheets[0]?.detectedHeaderRowIndex ?? 0
  );
  const [headerRowB, setHeaderRowB] = useState(
    existingConfig?.headerRowB ?? workbookB.sheets[0]?.detectedHeaderRowIndex ?? 0
  );
  const [numericMode, setNumericMode] = useState<'exact' | 'display' | 'tolerance'>(
    existingConfig?.numericMode ?? 'exact'
  );
  const [tolerance, setTolerance] = useState(String(existingConfig?.tolerance ?? '0.000001'));
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(existingConfig?.ignoreWhitespace ?? true);
  const [treatEmptyAsEqual, setTreatEmptyAsEqual] = useState(existingConfig?.treatEmptyAsEqual ?? true);
  const [caseInsensitive, setCaseInsensitive] = useState(existingConfig?.caseInsensitive ?? false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIgnore, setShowIgnore] = useState(false);
  const [showColTol, setShowColTol] = useState(false);

  const sheetAData = useMemo(
    () => workbookA.sheets.find((s) => s.name === sheetA) ?? workbookA.sheets[0],
    [workbookA, sheetA]
  );
  const sheetBData = useMemo(
    () => workbookB.sheets.find((s) => s.name === sheetB) ?? workbookB.sheets[0],
    [workbookB, sheetB]
  );

  // Update header row when sheet changes
  useEffect(() => {
    if (sheetAData) setHeaderRowA(sheetAData.detectedHeaderRowIndex);
  }, [sheetAData]);
  useEffect(() => {
    if (sheetBData) setHeaderRowB(sheetBData.detectedHeaderRowIndex);
  }, [sheetBData]);

  const allHeaders = useMemo(() => {
    if (!sheetAData || !sheetBData) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const h of sheetAData.headers) {
      if (!seen.has(h)) {
        seen.add(h);
        result.push(h);
      }
    }
    for (const h of sheetBData.headers) {
      if (!seen.has(h)) {
        seen.add(h);
        result.push(h);
      }
    }
    return result;
  }, [sheetAData, sheetBData]);

  // Auto-select key column - prefer ISIN-like columns
  useEffect(() => {
    if (!keyColumn && allHeaders.length > 0) {
      const preferred = allHeaders.find((h) =>
        /isin|cusip|sedol|ric|ticker|id|code|identifier/i.test(h)
      );
      setKeyColumn(preferred ?? allHeaders[0]);
    }
  }, [allHeaders, keyColumn]);

  const validationPreview = useMemo(() => {
    if (!sheetAData || !sheetBData || !keyColumn) return null;
    return validateKeyColumn(sheetAData.rows, sheetBData.rows, keyColumn);
  }, [sheetAData, sheetBData, keyColumn]);

  const canRun = keyColumn && sheetA && sheetB && !validationPreview?.blocking;

  const handleRun = () => {
    if (!sheetAData || !sheetBData || !keyColumn) return;

    const config: ComparisonConfig = {
      sheetA,
      sheetB,
      keyColumn,
      headerRowA,
      headerRowB,
      numericMode,
      tolerance: parseFloat(tolerance) || 0,
      ignoreWhitespace,
      treatEmptyAsEqual,
      caseInsensitive,
    };

    setConfig(config);
    runComparison({
      headersA: sheetAData.headers,
      headersB: sheetBData.headers,
      rowsA: sheetAData.rows,
      rowsB: sheetBData.rows,
      keyColumn,
      config,
      metadataA: sheetAData.metadata,
      metadataB: sheetBData.metadata,
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Comparison Configuration</h2>
      </div>

      {/* Sheet Selection */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            File A worksheet
          </Label>
          <Select value={sheetA} onValueChange={setSheetA}>
            <SelectTrigger>
              <SelectValue placeholder="Select sheet" />
            </SelectTrigger>
            <SelectContent>
              {workbookA.sheets.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name} ({s.rows.length.toLocaleString()} rows)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            File B worksheet
          </Label>
          <Select value={sheetB} onValueChange={setSheetB}>
            <SelectTrigger>
              <SelectValue placeholder="Select sheet" />
            </SelectTrigger>
            <SelectContent>
              {workbookB.sheets.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name} ({s.rows.length.toLocaleString()} rows)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Key Column Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">
          Match rows using
        </Label>
        <Select value={keyColumn} onValueChange={setKeyColumn}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select a key column" />
          </SelectTrigger>
          <SelectContent>
            {allHeaders.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose the column that uniquely identifies each row. This is used to match rows between the two files.
        </p>
      </div>

      {/* Validation Preview */}
      {validationPreview && (
        <div className="mt-4 space-y-2">
          {validationPreview.duplicatesA > 0 && (
            <ValidationWarning
              type="warning"
              message={`${validationPreview.duplicatesA} duplicate key(s) detected in File A`}
              detail="Duplicate keys may cause incorrect matching. The first occurrence will be used."
            />
          )}
          {validationPreview.duplicatesB > 0 && (
            <ValidationWarning
              type="warning"
              message={`${validationPreview.duplicatesB} duplicate key(s) detected in File B`}
              detail="Duplicate keys may cause incorrect matching. The first occurrence will be used."
            />
          )}
          {validationPreview.emptyA > 0 && (
            <ValidationWarning
              type="warning"
              message={`${validationPreview.emptyA} row(s) in File A have no ${keyColumn}`}
              detail="Rows without a key cannot be matched and will be skipped."
            />
          )}
          {validationPreview.emptyB > 0 && (
            <ValidationWarning
              type="warning"
              message={`${validationPreview.emptyB} row(s) in File B have no ${keyColumn}`}
              detail="Rows without a key cannot be matched and will be skipped."
            />
          )}
          {validationPreview.uniqueMatched > 0 && validationPreview.duplicatesA === 0 && validationPreview.duplicatesB === 0 && (
            <ValidationWarning
              type="success"
              message={`${validationPreview.uniqueMatched.toLocaleString()} unique rows will be compared`}
            />
          )}
        </div>
      )}

      {/* Advanced Settings */}
      <div className="mt-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced comparison settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-6 rounded-lg border bg-card p-5">
            {/* Numeric Comparison */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Numeric comparison</Label>
              <RadioGroup
                value={numericMode}
                onValueChange={(v) => setNumericMode(v as 'exact' | 'display' | 'tolerance')}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="exact" id="exact" />
                  <Label htmlFor="exact" className="text-sm font-normal cursor-pointer">
                    Exact numeric value
                    <span className="ml-2 text-xs text-muted-foreground">100.11 ≠ 100.110</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="display" id="display" />
                  <Label htmlFor="display" className="text-sm font-normal cursor-pointer">
                    Display value
                    <span className="ml-2 text-xs text-muted-foreground">100.11 = 100.110</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="tolerance" id="tolerance" />
                  <Label htmlFor="tolerance" className="text-sm font-normal cursor-pointer">
                    Tolerance
                    <span className="ml-2 text-xs text-muted-foreground">|new − old| ≤ tolerance</span>
                  </Label>
                </div>
              </RadioGroup>
              {numericMode === 'tolerance' && (
                <div className="flex items-center gap-2 pl-7">
                  <Label className="text-xs text-muted-foreground">Tolerance:</Label>
                  <Input
                    type="number"
                    value={tolerance}
                    onChange={(e) => setTolerance(e.target.value)}
                    className="h-8 w-32 font-mono text-xs"
                    step="0.000001"
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Ignore Columns */}
            <div className="space-y-3">
              <button
                onClick={() => setShowIgnore(!showIgnore)}
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                {showIgnore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Ignore columns
              </button>
              {showIgnore && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Selected columns will be excluded from comparison entirely.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allHeaders.map((h) => {
                      const ignored = ignoredColumns.includes(h);
                      return (
                        <button
                          key={h}
                          onClick={() =>
                            setIgnoredColumns(
                              ignored ? ignoredColumns.filter((c) => c !== h) : [...ignoredColumns, h]
                            )
                          }
                          className={cn(
                            'rounded border px-2 py-0.5 text-xs transition-colors',
                            ignored
                              ? 'border-destructive/40 bg-destructive/10 text-destructive line-through'
                              : 'border-border bg-muted/50 text-foreground hover:border-primary/40'
                          )}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                  {ignoredColumns.length > 0 && (
                    <button
                      onClick={() => setIgnoredColumns([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Per-column tolerances */}
            <div className="space-y-3">
              <button
                onClick={() => setShowColTol(!showColTol)}
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                {showColTol ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Per-column tolerance
              </button>
              {showColTol && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Override the global tolerance for specific numeric columns.</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allHeaders.map((h) => (
                      <div key={h} className="flex items-center gap-2">
                        <span className="w-48 truncate text-xs text-foreground">{h}</span>
                        <Input
                          type="number"
                          placeholder="global"
                          value={columnTolerances[h] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const next = { ...columnTolerances };
                            if (val === '') delete next[h];
                            else next[h] = parseFloat(val);
                            setColumnTolerances(next);
                          }}
                          className="h-7 w-28 font-mono text-xs"
                          step="0.000001"
                        />
                        {columnTolerances[h] !== undefined && (
                          <button
                            onClick={() => {
                              const next = { ...columnTolerances };
                              delete next[h];
                              setColumnTolerances(next);
                            }}
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* String Comparison */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Text comparison</Label>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="ws"
                    checked={ignoreWhitespace}
                    onCheckedChange={(v) => setIgnoreWhitespace(v === true)}
                  />
                  <Label htmlFor="ws" className="text-sm font-normal cursor-pointer">
                    Ignore leading/trailing whitespace
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="empty"
                    checked={treatEmptyAsEqual}
                    onCheckedChange={(v) => setTreatEmptyAsEqual(v === true)}
                  />
                  <Label htmlFor="empty" className="text-sm font-normal cursor-pointer">
                    Treat empty and null as equal
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="case"
                    checked={caseInsensitive}
                    onCheckedChange={(v) => setCaseInsensitive(v === true)}
                  />
                  <Label htmlFor="case" className="text-sm font-normal cursor-pointer">
                    Case-insensitive text comparison
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Run Button */}
      <div className="mt-8 flex justify-end">
        <Button size="lg" disabled={!canRun} onClick={handleRun}>
          <Play className="mr-2 h-4 w-4" />
          Run Comparison
        </Button>
      </div>
    </div>
  );
}

function ValidationWarning({
  type,
  message,
  detail,
}: {
  type: 'warning' | 'success';
  message: string;
  detail?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border p-3 text-sm',
        type === 'warning'
          ? 'border-warning/30 bg-warning/5'
          : 'border-success/30 bg-success/5'
      )}
    >
      {type === 'warning' ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      )}
      <div>
        <p className={cn('font-medium', type === 'warning' ? 'text-warning' : 'text-success')}>
          {message}
        </p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function validateKeyColumn(
  rowsA: Record<string, CellValue>[],
  rowsB: Record<string, CellValue>[],
  keyColumn: string
) {
  const countA = new Map<string, number>();
  const countB = new Map<string, number>();
  let emptyA = 0;
  let emptyB = 0;

  for (const row of rowsA) {
    const val = row[keyColumn];
    if (isEmpty(val)) {
      emptyA++;
      continue;
    }
    const key = String(val).trim();
    countA.set(key, (countA.get(key) ?? 0) + 1);
  }
  for (const row of rowsB) {
    const val = row[keyColumn];
    if (isEmpty(val)) {
      emptyB++;
      continue;
    }
    const key = String(val).trim();
    countB.set(key, (countB.get(key) ?? 0) + 1);
  }

  let duplicatesA = 0;
  let duplicatesB = 0;
  for (const [, count] of countA) if (count > 1) duplicatesA++;
  for (const [, count] of countB) if (count > 1) duplicatesB++;

  let uniqueMatched = 0;
  for (const key of countA.keys()) if (countB.has(key)) uniqueMatched++;

  return {
    duplicatesA,
    duplicatesB,
    emptyA,
    emptyB,
    uniqueMatched,
    blocking: false,
  };
}
