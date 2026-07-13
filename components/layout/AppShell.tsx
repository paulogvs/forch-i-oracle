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
    <div className="min-h-screen relative">
      {/* Grain overlay — subtle texture for physical depth */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 surface-elevated px-3 py-2 text-sm">
        Saltar al contenido
      </a>

      {/* Sidebar (lg+) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border-subtle bg-surface/50 backdrop-blur-2xl z-30" role="navigation" aria-label="Navegación principal" style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}>
        <Link href="/" className="doppelrand !bg-transparent !border-0 !shadow-none !p-0 mx-3 mt-3">
          <div className="doppelrand-inner flex items-center gap-3 py-2.5 px-4 !rounded-[var(--r-md)] bg-elevated/80">
            <span className="h-8 w-8 rounded-md bg-gradient-to-br from-accent-premium/30 to-accent-premium/10 border border-accent-premium/30 flex items-center justify-center shadow-[0_0_12px_rgba(226,179,64,0.1)]">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-premium shadow-[0_0_6px_rgba(226,179,64,0.5)]" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-bold tracking-tight text-fg-primary">FORCH.i</span>
              <span className="text-[10px] text-gold tracking-[0.15em] font-semibold">ORACLE</span>
            </div>
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
                  'group flex items-center gap-3 h-10 px-3 rounded-[var(--r-md)] text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                  active
                    ? `${accentColor} ring-1 ring-current/20 nav-active-glow shadow-md`
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-secondary hover:text-fg-primary hover:bg-elevated/60 transition-all duration-200 hover:shadow-sm"
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
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/70 backdrop-blur-2xl border-t border-border-subtle" role="navigation" aria-label="Navegación móvil" style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.2)' }}>
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
                    'h-full flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all duration-200 relative',
                    active ? colorMap[item.href] : 'text-fg-tertiary hover:text-fg-secondary',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-current shadow-[0_0_8px_rgba(226,179,64,0.5)]" />}
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
