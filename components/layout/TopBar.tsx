'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { LiveDot } from '@/components/ui/LiveDot';
import { Button } from '@/components/ui/Button';
import { useTournamentStore } from '@/lib/store/tournament-store';
import { formatRelativeTime } from '@/lib/utils';
import { mutate } from 'swr';
import { toast } from 'sonner';

export function TopBar() {
  const { lastUpdated, isLive, bumpRefresh } = useTournamentStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleRefresh() {
    try {
      await Promise.all([
        mutate('/api/fixture'),
        mutate('/api/accuracy'),
        mutate('/api/simulate-tournament'),
        mutate('/api/live-scores'),
      ]);
      bumpRefresh();
      toast.success('Datos actualizados');
    } catch {
      toast.error('Error al actualizar');
    }
  }

  return (
    <header className="fixed top-0 inset-x-0 lg:left-64 z-20 h-14 bg-canvas/80 backdrop-blur-xl border-b border-border-subtle" role="banner">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 lg:hidden">
          <span className="text-[13px] font-bold">FORCH.i</span>
          <span className="text-[11px] text-gold tracking-widest">ORACLE</span>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <LiveDot active={isLive} label={isLive ? 'En vivo' : 'Datos en reposo'} />
          {lastUpdated && (
            <span className="t-meta" suppressHydrationWarning>
              Actualizado {formatRelativeTime(new Date(lastUpdated))}
            </span>
          )}
        </div>

        <Button variant={isLive ? 'primary' : 'ghost'} size="sm" onClick={handleRefresh} aria-label="Actualizar datos">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>
    </header>
  );
}
