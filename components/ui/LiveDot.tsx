import { cn } from '@/lib/utils';

export function LiveDot({ active = true, label, className }: { active?: boolean; label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        active ? 'bg-state-success live-dot' : 'bg-fg-disabled'
      )} />
      {label && <span className="t-micro">{label}</span>}
    </span>
  );
}
