import { create } from 'zustand';
import type {
  ComparisonConfig,
  ComparisonResult,
  ParsedWorkbook,
  AppView,
  ThemeMode,
  FieldChangeSummary,
} from '@/types';
import { compareWorkbooks, buildFieldChangeSummaries, type EngineInput } from '@/features/diff/diffEngine';

export interface SessionEntry {
  id: string;
  fileNameA: string;
  fileNameB: string;
  keyColumn: string;
  timestamp: number;
  summary: { changed: number; added: number; removed: number; unchanged: number; totalMatched: number };
}

interface AppState {
  // Files
  workbookA: ParsedWorkbook | null;
  workbookB: ParsedWorkbook | null;
  fileAError: string | null;
  fileBError: string | null;

  // Config
  config: ComparisonConfig | null;
  ignoredColumns: string[];
  columnTolerances: Record<string, number>;

  // Results
  result: ComparisonResult | null;
  fieldChangeSummaries: FieldChangeSummary[];

  // Session history
  sessionHistory: SessionEntry[];

  // UI
  view: AppView;
  theme: ThemeMode;
  showAllFields: boolean;
  searchQuery: string;
  statusFilter: { changed: boolean; added: boolean; removed: boolean; unchanged: boolean };
  fieldFilter: string;
  expandedRowKeys: Set<string>;
  currentChangedIndex: number;

  // Actions
  setWorkbookA: (wb: ParsedWorkbook | null, error?: string | null) => void;
  setWorkbookB: (wb: ParsedWorkbook | null, error?: string | null) => void;
  setConfig: (config: ComparisonConfig) => void;
  setIgnoredColumns: (cols: string[]) => void;
  setColumnTolerances: (tolerances: Record<string, number>) => void;
  runComparison: (input: EngineInput) => void;
  setView: (view: AppView) => void;
  toggleTheme: () => void;
  setShowAllFields: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: Partial<AppState['statusFilter']>) => void;
  setFieldFilter: (field: string) => void;
  toggleRowExpansion: (key: string) => void;
  setCurrentChangedIndex: (idx: number) => void;
  reset: () => void;
}

const HISTORY_KEY = 'xls-diff-history';

function loadHistory(): SessionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries: SessionEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 10)));
}

export const useStore = create<AppState>((set, get) => ({
  workbookA: null,
  workbookB: null,
  fileAError: null,
  fileBError: null,
  config: null,
  ignoredColumns: [],
  columnTolerances: {},
  result: null,
  fieldChangeSummaries: [],
  sessionHistory: loadHistory(),
  view: 'upload',
  currentChangedIndex: 0,
  theme: 'light' as ThemeMode,
  showAllFields: false,
  searchQuery: '',
  statusFilter: { changed: true, added: true, removed: true, unchanged: false },
  fieldFilter: 'all',
  expandedRowKeys: new Set(),

  setWorkbookA: (wb, error = null) =>
    set({ workbookA: wb, fileAError: error, result: null, fieldChangeSummaries: [] }),

  setWorkbookB: (wb, error = null) =>
    set({ workbookB: wb, fileBError: error, result: null, fieldChangeSummaries: [] }),

  setConfig: (config) => set({ config }),
  setIgnoredColumns: (cols) => set({ ignoredColumns: cols }),
  setColumnTolerances: (tolerances) => set({ columnTolerances: tolerances }),

  runComparison: (input) => {
    const { ignoredColumns, columnTolerances, workbookA, workbookB } = get();
    // Filter out ignored columns
    const filteredInput = {
      ...input,
      headersA: input.headersA.filter((h) => !ignoredColumns.includes(h)),
      headersB: input.headersB.filter((h) => !ignoredColumns.includes(h)),
    };
    // Apply per-column tolerances by patching config per field during comparison
    const result = compareWorkbooks(filteredInput, columnTolerances);
    const fieldChangeSummaries = buildFieldChangeSummaries(result);

    // Save to session history
    const entry: SessionEntry = {
      id: Date.now().toString(),
      fileNameA: workbookA?.fileName ?? 'File A',
      fileNameB: workbookB?.fileName ?? 'File B',
      keyColumn: input.keyColumn,
      timestamp: Date.now(),
      summary: result.summary,
    };
    const history = [entry, ...get().sessionHistory.filter((e) => e.id !== entry.id)].slice(0, 10);
    saveHistory(history);

    set({ result, fieldChangeSummaries, view: 'compare', expandedRowKeys: new Set(), sessionHistory: history, currentChangedIndex: 0 });
  },

  setView: (view) => set({ view }),
  toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
  setShowAllFields: (show) => set({ showAllFields: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) =>
    set({ statusFilter: { ...get().statusFilter, ...filter } }),
  setFieldFilter: (field) => set({ fieldFilter: field }),
  toggleRowExpansion: (key) => {
    const expanded = new Set(get().expandedRowKeys);
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
    set({ expandedRowKeys: expanded });
  },
  setCurrentChangedIndex: (idx) => set({ currentChangedIndex: idx }),
  reset: () =>
    set({
      workbookA: null,
      workbookB: null,
      fileAError: null,
      fileBError: null,
      config: null,
      ignoredColumns: [],
      columnTolerances: {},
      result: null,
      fieldChangeSummaries: [],
      view: 'upload',
      showAllFields: false,
      searchQuery: '',
      statusFilter: { changed: true, added: true, removed: true, unchanged: false },
      fieldFilter: 'all',
      expandedRowKeys: new Set(),
      currentChangedIndex: 0,
    }),
}));
