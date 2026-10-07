import { useEffect } from 'react';
import { FileSpreadsheet, GitCompare, BarChart3, ShieldCheck, Sun, Moon, RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UploadView } from '@/components/upload/UploadView';
import { CompareView } from '@/components/comparison/CompareView';
import { FieldChangesView } from '@/components/comparison/FieldChangesView';
import { QualityView } from '@/components/comparison/QualityView';

export function AppShell() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const reset = useStore((s) => s.reset);
  const workbookA = useStore((s) => s.workbookA);
  const workbookB = useStore((s) => s.workbookB);
  const result = useStore((s) => s.result);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const hasResult = result !== null;
  const bothLoaded = workbookA && workbookB;
  const canNavigate = bothLoaded || hasResult;

  const navItems: { id: typeof view; label: string; icon: React.ReactNode; disabled: boolean }[] = [
    { id: 'compare', label: 'Compare', icon: <GitCompare className="h-3.5 w-3.5" />, disabled: !canNavigate },
    { id: 'fields', label: 'Fields', icon: <BarChart3 className="h-3.5 w-3.5" />, disabled: !hasResult },
    { id: 'quality', label: 'Data Quality', icon: <ShieldCheck className="h-3.5 w-3.5" />, disabled: !hasResult },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">XLS DIFF</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Financial Data Comparison
              </span>
            </div>
          </div>

          {/* Nav */}
          {canNavigate && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => setView(item.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    view === item.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                    item.disabled && 'cursor-not-allowed opacity-40'
                  )}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {canNavigate && (
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3 w-3" />
                <span className="hidden sm:inline">New Comparison</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="animate-fade-in">
        {view === 'upload' && <UploadView />}
        {view === 'compare' && <CompareView />}
        {view === 'fields' && hasResult && <FieldChangesView />}
        {view === 'quality' && hasResult && <QualityView />}
      </main>
    </div>
  );
}
