import { useState, useMemo } from 'react';
import {
  BarChart3, ChevronRight, ArrowUp, ArrowDown,
  ChevronDown, TrendingUp, Users, Plus, Minus, RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { formatNumber, formatDiff, formatPercentage, isNumeric } from '@/features/diff/numericDiff';
import type { CellValue, FieldChangeSummary } from '@/types';

// ── keyword classifier ─────────────────────────────────────────────────────
const INDEX_KEYWORDS = [
  /^index/i, /divisor/i, /close/i, /open/i, /return/i, /level/i,
  /nav/i, /value$/i, /benchmark/i, /base/i,
];
const CONSTITUENT_KEYWORDS = [
  /weight/i, /price/i, /market.?cap/i, /shares/i, /float/i,
  /isin/i, /sedol/i, /cusip/i, /ticker/i, /sector/i, /country/i,
  /currency/i, /fx/i, /performance/i, /continent/i,
  /listing/i, /reit/i, /instrument/i, /security/i, /constituent/i,
];

function classifyField(field: string): 'index' | 'constituent' | 'other' {
  if (INDEX_KEYWORDS.some((r) => r.test(field))) return 'index';
  if (CONSTITUENT_KEYWORDS.some((r) => r.test(field))) return 'constituent';
  return 'other';
}

type ChangeType = 'changed' | 'added' | 'removed';

interface FieldEntry {
  field: string;
  type: ChangeType;
  summary?: FieldChangeSummary; // only for 'changed'
}

// ── main component ─────────────────────────────────────────────────────────
export function FieldChangesView() {
  const fieldChangeSummaries = useStore((s) => s.fieldChangeSummaries);
  const result = useStore((s) => s.result);
  const workbookA = useStore((s) => s.workbookA);
  const workbookB = useStore((s) => s.workbookB);

  const [selected, setSelected] = useState<{ field: string; type: ChangeType } | null>(null);

  // Build full entry list: changed + added columns + removed columns
  const allEntries = useMemo((): FieldEntry[] => {
    const entries: FieldEntry[] = fieldChangeSummaries.map((s) => ({
      field: s.field,
      type: 'changed',
      summary: s,
    }));
    for (const f of result?.columnChanges.added ?? []) {
      entries.push({ field: f, type: 'added' });
    }
    for (const f of result?.columnChanges.removed ?? []) {
      entries.push({ field: f, type: 'removed' });
    }
    return entries;
  }, [fieldChangeSummaries, result]);

  const { indexEntries, constituentEntries, otherEntries } = useMemo(() => {
    const index: FieldEntry[] = [];
    const constituent: FieldEntry[] = [];
    const other: FieldEntry[] = [];
    for (const e of allEntries) {
      const cat = classifyField(e.field);
      if (cat === 'index') index.push(e);
      else if (cat === 'constituent') constituent.push(e);
      else other.push(e);
    }
    return { indexEntries: index, constituentEntries: constituent, otherEntries: other };
  }, [allEntries]);

  const selectedSummary = useMemo(
    () => (selected ?? (allEntries[0] ? { field: allEntries[0].field, type: allEntries[0].type } : null))?.type === 'changed'
      ? fieldChangeSummaries.find((f) => f.field === (selected ?? allEntries[0])?.field)
      : null,
    [fieldChangeSummaries, selected, allEntries]
  );

  const fileNameA = workbookA?.fileName ?? 'File A';
  const fileNameB = workbookB?.fileName ?? 'File B';

  // Auto-select first entry if nothing selected
  const effectiveSelected = selected ?? (allEntries[0] ? { field: allEntries[0].field, type: allEntries[0].type as ChangeType } : null);

  if (allEntries.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-foreground">No field changes detected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The datasets are identical according to your comparison settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* ── Header with file names ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Field Changes</h2>
          <span className="ml-auto rounded-full bg-changed/10 px-2.5 py-0.5 text-xs font-semibold text-changed">
            {allEntries.length} fields affected
          </span>
        </div>
        {/* File comparison block */}
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Comparing</p>
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 rounded bg-info/10 px-1.5 py-0.5 text-xs font-bold text-info">A</span>
              <span className="truncate text-sm font-medium text-foreground" title={fileNameA}>{fileNameA}</span>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">VS</span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 rounded bg-success/10 px-1.5 py-0.5 text-xs font-bold text-success">B</span>
              <span className="truncate text-sm font-medium text-foreground" title={fileNameB}>{fileNameB}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]" style={{ minHeight: '600px' }}>
        {/* ── Left: grouped field list ── */}
        <div className="space-y-3">
          {indexEntries.length > 0 && (
            <CategorySection
              title="Index Fields"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              accentColor="text-info"
              borderColor="border-info/20"
              bgColor="bg-info/5"
              entries={indexEntries}
              selected={effectiveSelected}
              onSelect={setSelected}
              fileNameA={fileNameA}
              fileNameB={fileNameB}
            />
          )}
          {constituentEntries.length > 0 && (
            <CategorySection
              title="Constituent Fields"
              icon={<Users className="h-3.5 w-3.5" />}
              accentColor="text-success"
              borderColor="border-success/20"
              bgColor="bg-success/5"
              entries={constituentEntries}
              selected={effectiveSelected}
              onSelect={setSelected}
              fileNameA={fileNameA}
              fileNameB={fileNameB}
            />
          )}
          {otherEntries.length > 0 && (
            <CategorySection
              title="Other Fields"
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              accentColor="text-muted-foreground"
              borderColor="border-border"
              bgColor="bg-muted/20"
              entries={otherEntries}
              selected={effectiveSelected}
              onSelect={setSelected}
              fileNameA={fileNameA}
              fileNameB={fileNameB}
            />
          )}
        </div>

        {/* ── Right: detail panel ── */}
        <div className="rounded-lg border bg-card">
          {effectiveSelected ? (
            effectiveSelected.type === 'changed' && selectedSummary ? (
              <FieldDetail summary={selectedSummary} fileNameA={fileNameA} fileNameB={fileNameB} />
            ) : (
              <div className="p-5">
                <ColumnOnlyDetail
                  field={effectiveSelected.field}
                  type={effectiveSelected.type}
                  fileNameA={fileNameA}
                  fileNameB={fileNameB}
                />
              </div>
            )
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-muted-foreground">
              <BarChart3 className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">Select a field to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── category section with changed / added / removed sub-groups ─────────────
function CategorySection({
  title, icon, accentColor, borderColor, bgColor,
  entries, selected, onSelect, fileNameA, fileNameB,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  borderColor: string;
  bgColor: string;
  entries: FieldEntry[];
  selected: { field: string; type: ChangeType } | null;
  onSelect: (s: { field: string; type: ChangeType }) => void;
  fileNameA: string;
  fileNameB: string;
}) {
  const [open, setOpen] = useState(true);

  const changed = entries.filter((e) => e.type === 'changed');
  const added = entries.filter((e) => e.type === 'added');
  const removed = entries.filter((e) => e.type === 'removed');

  return (
    <div className={cn('rounded-lg border', borderColor, bgColor)}>
      {/* Section header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className={cn('shrink-0', accentColor)}>{icon}</span>
        <span className={cn('text-xs font-semibold', accentColor)}>{title}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {changed.length > 0 && <Pill label={`${changed.length} changed`} color="bg-changed/15 text-changed" />}
          {added.length > 0 && <Pill label={`${added.length} added`} color="bg-added/15 text-added" />}
          {removed.length > 0 && <Pill label={`${removed.length} removed`} color="bg-removed/15 text-removed" />}
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', !open && '-rotate-90')} />
        </div>
      </button>

      {open && (
        <div className="border-t space-y-0.5 px-2 pb-2 pt-1">
          {changed.length > 0 && (
            <SubGroup
              label="Changed"
              icon={<RefreshCw className="h-3 w-3" />}
              color="text-changed"
              entries={changed}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {added.length > 0 && (
            <SubGroup
              label="Added in File B"
              icon={<Plus className="h-3 w-3" />}
              color="text-added"
              entries={added}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {removed.length > 0 && (
            <SubGroup
              label="Removed from File A"
              icon={<Minus className="h-3 w-3" />}
              color="text-removed"
              entries={removed}
              selected={selected}
              onSelect={onSelect}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SubGroup({
  label, icon, color, entries, selected, onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  entries: FieldEntry[];
  selected: { field: string; type: ChangeType } | null;
  onSelect: (s: { field: string; type: ChangeType }) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('flex w-full items-center gap-1.5 rounded px-2 py-1 text-left', color)}
      >
        <span className="shrink-0">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
        <span className="ml-1 text-xs opacity-70">({entries.length})</span>
        <ChevronDown className={cn('ml-auto h-3 w-3 opacity-60 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {entries.map((e) => {
            const isSelected = selected?.field === e.field && selected?.type === e.type;
            return (
              <button
                key={`${e.field}-${e.type}`}
                onClick={() => onSelect({ field: e.field, type: e.type })}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-background/70 text-foreground'
                )}
              >
                <span className="truncate text-xs font-medium">{e.field}</span>
                <span className="ml-2 flex shrink-0 items-center gap-1">
                  {e.type === 'changed' && e.summary && (
                    <span className={cn('font-mono text-xs font-semibold', isSelected ? 'text-primary' : 'text-changed')}>
                      {e.summary.changeCount.toLocaleString()}
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-medium', color)}>{label}</span>
  );
}

// ── detail: changed field with row-level diffs ─────────────────────────────
function FieldDetail({
  summary, fileNameA, fileNameB,
}: {
  summary: FieldChangeSummary;
  fileNameA: string;
  fileNameB: string;
}) {
  const result = useStore((s) => s.result);
  const hasNumeric = summary.changes.some((c) => isNumeric(c.oldValue) && isNumeric(c.newValue));
  const category = classifyField(summary.field);
  const categoryLabel = category === 'index' ? 'Index Field' : category === 'constituent' ? 'Constituent Field' : 'Field';
  const categoryColor = category === 'index' ? 'text-info bg-info/10' : category === 'constituent' ? 'text-success bg-success/10' : 'text-muted-foreground bg-muted';

  // Build full row list for File B — changed rows from summary + unchanged rows from result
  const allRows = useMemo(() => {
    const changedKeys = new Set(summary.changes.map((c) => c.key));
    const unchangedRows = (result?.rows ?? [])
      .filter((r) => r.status === 'UNCHANGED')
      .map((r) => {
        const f = r.fields.find((f) => f.field === summary.field);
        return f ? { key: r.key, oldValue: f.oldValue, newValue: f.newValue, absolute: 0, percentage: null, isChanged: false } : null;
      })
      .filter(Boolean) as { key: string; oldValue: CellValue; newValue: CellValue; absolute: number; percentage: number | null; isChanged: boolean }[];

    const changedRows = summary.changes.map((c) => ({ ...c, isChanged: true }));
    const combined = [
      ...changedRows,
      ...unchangedRows.filter((r) => !changedKeys.has(r.key)),
    ];
    // Sort: changed first, then by key
    return combined.sort((a, b) => (b.isChanged ? 1 : 0) - (a.isChanged ? 1 : 0) || a.key.localeCompare(b.key));
  }, [summary, result]);

  const shortA = fileNameA.length > 20 ? fileNameA.slice(0, 18) + '…' : fileNameA;
  const shortB = fileNameB.length > 20 ? fileNameB.slice(0, 18) + '…' : fileNameB;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <div className="border-b px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{summary.field}</h3>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', categoryColor)}>{categoryLabel}</span>
          <span className="rounded-full bg-changed/10 px-2 py-0.5 text-xs font-semibold text-changed">
            {summary.changeCount.toLocaleString()} changed
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {allRows.length.toLocaleString()} total
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-changed mr-1 align-middle" />
          Highlighted rows = changed in File B
        </p>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-4 pl-5 text-left font-medium">KEY</th>
              <th className="px-4 py-2 text-right font-medium" title={fileNameA}>{shortA}</th>
              <th className="px-4 py-2 text-right font-medium" title={fileNameB}>{shortB}</th>
              {hasNumeric && <th className="px-4 py-2 text-right font-medium">Δ</th>}
              {hasNumeric && <th className="py-2 pl-4 pr-5 text-right font-medium">Δ%</th>}
            </tr>
          </thead>
          <tbody>
            {allRows.map((change) => {
              const isPositive = change.absolute > 0;
              const isNegative = change.absolute < 0;
              const color = isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground';
              return (
                <tr key={change.key} className={cn(
                  'border-b last:border-0',
                  change.isChanged ? 'bg-changed/5 hover:bg-changed/10' : 'hover:bg-muted/30'
                )}>
                  <td className="py-2 pr-4 pl-5 font-mono text-xs font-medium text-foreground">
                    {change.isChanged && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-changed align-middle" />}
                    {change.key}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatValue(change.oldValue)}
                  </td>
                  <td className={cn('px-4 py-2 text-right font-mono text-xs tabular-nums', change.isChanged ? 'font-semibold text-foreground' : 'text-foreground')}>
                    {formatValue(change.newValue)}
                  </td>
                  {hasNumeric && (
                    <td className={cn('px-4 py-2 text-right font-mono text-xs font-semibold tabular-nums', change.isChanged ? color : 'text-muted-foreground')}>
                      {change.isChanged && isNumeric(change.oldValue) && isNumeric(change.newValue) ? (
                        <span className="inline-flex items-center gap-1">
                          {isPositive ? <ArrowUp className="h-3 w-3" /> : isNegative ? <ArrowDown className="h-3 w-3" /> : null}
                          {formatDiff(change.absolute)}
                        </span>
                      ) : '—'}
                    </td>
                  )}
                  {hasNumeric && (
                    <td className={cn('py-2 pl-4 pr-5 text-right font-mono text-xs tabular-nums', change.isChanged ? color : 'text-muted-foreground')}>
                      {change.isChanged && change.percentage !== null ? formatPercentage(change.percentage) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── detail: added or removed column (no row-level data) ────────────────────
function ColumnOnlyDetail({
  field, type, fileNameA, fileNameB,
}: {
  field: string;
  type: ChangeType;
  fileNameA: string;
  fileNameB: string;
}) {
  const isAdded = type === 'added';
  const color = isAdded ? 'text-added' : 'text-removed';
  const bg = isAdded ? 'bg-added/5 border-added/20' : 'bg-removed/5 border-removed/20';
  const Icon = isAdded ? Plus : Minus;
  const category = classifyField(field);
  const categoryLabel = category === 'index' ? 'Index Field' : category === 'constituent' ? 'Constituent Field' : 'Field';
  const categoryColor = category === 'index' ? 'text-info bg-info/10' : category === 'constituent' ? 'text-success bg-success/10' : 'text-muted-foreground bg-muted';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{field}</h3>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', categoryColor)}>{categoryLabel}</span>
      </div>
      <div className={cn('flex items-start gap-3 rounded-lg border p-4', bg)}>
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', color)} />
        <div>
          <p className={cn('text-sm font-semibold', color)}>
            {isAdded ? 'Column added in File B' : 'Column removed from File A'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdded
              ? <>This column exists in <span className="font-medium text-success">{fileNameB}</span> but not in <span className="font-medium text-info">{fileNameA}</span>.</>
              : <>This column exists in <span className="font-medium text-info">{fileNameA}</span> but not in <span className="font-medium text-success">{fileNameB}</span>.</>
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function formatValue(value: CellValue): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  return String(value);
}
