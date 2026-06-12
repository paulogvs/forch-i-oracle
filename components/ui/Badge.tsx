import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'premium' | 'info' | 'live' | 'violet';
  children: React.ReactNode;
  className?: string;
}

const VAR = {
  neutral: 'bg-overlay text-fg-secondary border-border-subtle',
  success: 'bg-state-success/10 text-state-success border-state-success/20',
  warning: 'bg-state-warning/10 text-state-warning border-state-warning/20',
  danger:  'bg-state-danger/10 text-state-danger border-state-danger/20',
  premium: 'bg-accent-premium/10 text-accent-premium border-accent-premium/20',
  info:    'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
  live:    'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20',
  violet:  'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
      VAR[variant], className
    )}>
      {children}
    </span>
  );
}
