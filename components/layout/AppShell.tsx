'use client';
import { LayoutDashboard, Trophy, Radio, BarChart2, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TopBar } from './TopBar';
import { AutoSync } from '@/components/system/AutoSync';
import { useTheme } from '@/lib/theme-context';
import { useI18n, LanguageSelector } from '@/lib/i18n';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';
import BackToTop from '@/components/BackToTop';

const NAV = [
  { href: '/',          label: 'nav.home',      icon: LayoutDashboard, key: '1' },
  { href: '/fixture',   label: 'nav.fixture',   icon: Trophy, key: '2' },
  { href: '/live',      label: 'nav.live',      icon: Radio, key: '3' },
  { href: '/stats',     label: 'nav.stats',     icon: BarChart2, key: '4' },
  { href: '/teams',     label: 'nav.teams',     icon: Users, key: '5' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen">
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 surface-elevated px-3 py-2 text-sm">
        Saltar al contenido
      </a>

      {/* Sidebar (lg+) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border-subtle bg-surface/60 backdrop-blur-xl z-30" role="navigation" aria-label="Navegación principal">
        <Link href="/" className="h-14 flex items-center gap-2 px-6 border-b border-border-subtle">
          <span className="h-7 w-7 rounded-md bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-accent-primary" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-bold tracking-tight">FORCH.i</span>
            <span className="text-[10px] text-gold tracking-widest">ORACLE</span>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const label = t(item.label as any);
            const accentMap: Record<string, string> = {
              '/': 'text-accent-primary bg-accent-primary/10 shadow-lg shadow-accent-primary/10',
              '/fixture': 'text-accent-premium bg-accent-premium/10 shadow-lg shadow-accent-premium/10',
              '/forecast': 'text-accent-primary bg-accent-primary/10 shadow-lg shadow-accent-primary/10',
              '/stats': 'text-accent-emerald bg-accent-emerald/10 shadow-lg shadow-accent-emerald/10',
              '/teams': 'text-accent-premium bg-accent-premium/10 shadow-lg shadow-accent-premium/10',
              '/live': 'text-accent-emerald bg-accent-emerald/10 shadow-lg shadow-accent-emerald/10',
            };
            const accentColor = accentMap[item.href] || 'text-accent-primary bg-accent-primary/10';
            const dotColor: Record<string, string> = {
              '/': 'bg-accent-primary',
              '/fixture': 'bg-accent-premium',
              '/forecast': 'bg-accent-primary',
              '/stats': 'bg-accent-emerald',
              '/teams': 'bg-accent-premium',
              '/live': 'bg-accent-emerald',
            };
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 h-10 px-3 rounded-[var(--r-md)] text-sm font-medium transition-all duration-200',
                  active
                    ? `${accentColor} ring-1 ring-current/20`
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-elevated/60',
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'drop-shadow-sm')} />
                <span>{label}</span>
                <span className="ml-auto text-[10px] text-fg-tertiary opacity-0 group-hover:opacity-100">{item.key}</span>
                {active && <span className={cn('ml-auto h-1.5 w-1.5 rounded-full', dotColor[item.href])} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-secondary hover:text-fg-primary hover:bg-elevated/60 transition-all"
              title={theme === 'dark' ? 'Modo claro (T)' : 'Modo oscuro (T)'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
              <span className="hidden xl:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </button>
            <LanguageSelector />
          </div>
          <p className="t-micro text-fg-tertiary">FORCH.i © 2026</p>
          <p className="t-micro text-fg-tertiary">{t('brand.badge' as any)}</p>
        </div>
      </aside>

      {/* Topbar (mobile + desktop) */}
      <TopBar />

      {/* Auto-sync background component */}
      <AutoSync />

      {/* Main */}
      <main id="main" className="lg:ml-64 pt-14 pb-24 lg:pb-8">
        <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-6">
          {children}
        </div>
      </main>

      {/* Back to top */}
      <BackToTop />

      {/* BottomNav (mobile) — scrollable for 7 items */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/80 backdrop-blur-xl border-t border-border-subtle" role="navigation" aria-label="Navegación móvil">
        <ul className="flex overflow-x-auto h-16 hide-scrollbar">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const colorMap: Record<string, string> = {
              '/': 'text-accent-primary',
              '/fixture': 'text-accent-premium',
              '/forecast': 'text-accent-primary',
              '/stats': 'text-accent-emerald',
              '/teams': 'text-accent-premium',
              '/live': 'text-accent-emerald',
            };
            return (
              <li key={item.href} className="shrink-0 w-[72px]">
                <Link
                  href={item.href}
                  className={cn(
                    'h-full flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors relative',
                    active ? colorMap[item.href] : 'text-fg-tertiary',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-current" />}
                  <Icon className="h-5 w-5" />
                  <span className="truncate w-full text-center">{t(item.label as any)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
