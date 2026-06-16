'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';

/**
 * Keyboard shortcuts:
 * - 1: Dashboard (/)
 * - 2: Fixture (/fixture)
 * - 3: Forecast (/forecast)
 * - 4: Stats (/stats)
 * - 5: Teams (/teams)
 * - L: Live (/live)
 * - B: Benchmark (/benchmark)
 * - T: Toggle theme
 * - /: Focus search (if exists)
 * - Escape: Close modals
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ignore if modifier key held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case '1': e.preventDefault(); router.push('/'); break;
        case '2': e.preventDefault(); router.push('/fixture'); break;
        case '3': e.preventDefault(); router.push('/forecast'); break;
        case '4': e.preventDefault(); router.push('/stats'); break;
        case '5': e.preventDefault(); router.push('/teams'); break;
        case 'l': e.preventDefault(); router.push('/live'); break;
        case 'b': e.preventDefault(); router.push('/benchmark'); break;
        case 't': e.preventDefault(); toggleTheme(); break;
        case '/': e.preventDefault(); document.querySelector<HTMLInputElement>('[type="search"], input[placeholder*="Buscar"]')?.focus(); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, toggleTheme]);
}
