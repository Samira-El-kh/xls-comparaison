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

interface AppState {
  // Files
  workbookA: ParsedWorkbook | null;
  workbookB: ParsedWorkbook | null;
  fileAError: string | null;
  fileBError: string | null;

  // Config
  config: ComparisonConfig | null;

  // Results
  result: ComparisonResult | null;
  fieldChangeSummaries: FieldChangeSummary[];

  // UI
  view: AppView;
  theme: ThemeMode;
  showAllFields: boolean;
  searchQuery: string;
  statusFilter: { changed: boolean; added: boolean; removed: boolean; unchanged: boolean };
  fieldFilter: string;
  expandedRowKeys: Set<string>;

  // Actions
  setWorkbookA: (wb: ParsedWorkbook | null, error?: string | null) => void;
  setWorkbookB: (wb: ParsedWorkbook | null, error?: string | null) => void;
  setConfig: (config: ComparisonConfig) => void;
  runComparison: (input: EngineInput) => void;
  setView: (view: AppView) => void;
  toggleTheme: () => void;
  setShowAllFields: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: Partial<AppState['statusFilter']>) => void;
  setFieldFilter: (field: string) => void;
  toggleRowExpansion: (key: string) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  workbookA: null,
  workbookB: null,
  fileAError: null,
  fileBError: null,
  config: null,
  result: null,
  fieldChangeSummaries: [],
  view: 'upload',
  theme: (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light') as ThemeMode,
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

  runComparison: (input) => {
    const result = compareWorkbooks(input);
    const fieldChangeSummaries = buildFieldChangeSummaries(result);
    set({ result, fieldChangeSummaries, view: 'compare', expandedRowKeys: new Set() });
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
  reset: () =>
    set({
      workbookA: null,
      workbookB: null,
      fileAError: null,
      fileBError: null,
      config: null,
      result: null,
      fieldChangeSummaries: [],
      view: 'upload',
      showAllFields: false,
      searchQuery: '',
      statusFilter: { changed: true, added: true, removed: true, unchanged: false },
      fieldFilter: 'all',
      expandedRowKeys: new Set(),
    }),
}));
