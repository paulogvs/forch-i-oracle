'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: '/fixture',
    label: 'Predicción',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    href: '/live',
    label: 'En Vivo',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: '/benchmark',
    label: 'Benchmark',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
];

export default function MainNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm animate-fade-in lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-full w-56 bg-surface/80 backdrop-blur-xl border-r border-white/[0.06] transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="text-xs font-bold text-white group-hover:text-accent-primary transition-colors duration-200">FORCH.i</span>
            <span className="text-xs font-bold text-gold">ORACLE</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-fg-secondary transition-colors" aria-label="Cerrar menú">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-2 mt-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-fg-secondary hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors duration-200 ${active ? 'text-accent-primary' : 'text-fg-tertiary'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0 animate-scale-in" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-fg-disabled text-center">FORCH.i © 2026 · WC2026</p>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-20 h-14 bg-canvas/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-3 sm:px-4 lg:px-6 lg:pl-[240px]">
        <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-white/[0.06] text-fg-secondary transition-colors" aria-label="Abrir menú">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1 text-center lg:text-left">
          <span className="text-xs font-bold text-white">FORCH.i</span>
          <span className="text-xs font-bold text-gold ml-0.5">ORACLE</span>
        </div>
      </header>
    </>
  );
}
