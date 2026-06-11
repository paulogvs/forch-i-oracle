'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/fixture', icon: '⚡', label: 'Pronósticos' },
  { href: '/live', icon: '📈', label: 'En Vivo' },
  { href: '/veredicto', icon: '🏆', label: 'Veredicto' },
  { href: '/torneo', icon: '🎮', label: 'Simulador' },
  { href: '/benchmark', icon: '🤖', label: 'Benchmark' },
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
      <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-[#08101C] border-r border-white/[0.06] transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white">FORCH.i</span>
            <span className="text-sm font-bold text-gradient-gold">ORACLE</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-text-secondary transition-colors" aria-label="Cerrar menú">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-accent-blue/15 text-accent-blue'
                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="text-sm w-5 text-center shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-text-muted text-center">FORCH.i © 2026 · WC2026</p>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-20 h-14 bg-[#050B14]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-3 sm:px-4 lg:px-6 lg:pl-[272px]">
        <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-white/[0.06] text-text-secondary transition-colors" aria-label="Abrir menú">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1 text-center lg:text-left">
          <span className="text-xs font-bold text-white">FORCH.i</span>
          <span className="text-xs font-bold text-gradient-gold ml-0.5">ORACLE</span>
        </div>
      </header>
    </>
  );
}
