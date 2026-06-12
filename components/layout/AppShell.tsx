'use client';
import { LayoutDashboard, Trophy, Radio, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TopBar } from './TopBar';
import { AutoSync } from '@/components/system/AutoSync';

const NAV = [
  { href: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/fixture',   label: 'Predicción', icon: Trophy },
  { href: '/live',      label: 'En Vivo',    icon: Radio },
  { href: '/benchmark', label: 'Benchmark',  icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
            // Color accent per nav item
            const accentMap: Record<string, string> = {
              '/': 'text-accent-primary bg-accent-primary/10',
              '/fixture': 'text-accent-premium bg-accent-premium/10',
              '/live': 'text-accent-emerald bg-accent-emerald/10',
              '/benchmark': 'text-accent-secondary bg-accent-secondary/10',
            };
            const accentColor = accentMap[item.href] || 'text-accent-primary bg-accent-primary/10';
            const dotColor: Record<string, string> = {
              '/': 'bg-accent-primary',
              '/fixture': 'bg-accent-premium',
              '/live': 'bg-accent-emerald',
              '/benchmark': 'bg-accent-secondary',
            };
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-10 px-3 rounded-[var(--r-md)] text-sm font-medium transition-all duration-200',
                  active
                    ? `${accentColor}`
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-elevated/60',
                )}
              >
                <Icon className={cn('h-4 w-4')} />
                <span>{item.label}</span>
                {active && <span className={cn('ml-auto h-1.5 w-1.5 rounded-full', dotColor[item.href])} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <p className="t-micro text-fg-tertiary">FORCH.i © 2026</p>
          <p className="t-micro text-fg-disabled">WorldCup 2026</p>
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

      {/* BottomNav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-surface/80 backdrop-blur-xl border-t border-border-subtle" role="navigation" aria-label="Navegación móvil">
        <ul className="h-full grid grid-cols-4">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const colorMap: Record<string, string> = {
              '/': 'text-accent-primary',
              '/fixture': 'text-accent-premium',
              '/live': 'text-accent-emerald',
              '/benchmark': 'text-accent-secondary',
            };
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'h-full flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                    active ? colorMap[item.href] : 'text-fg-tertiary',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
