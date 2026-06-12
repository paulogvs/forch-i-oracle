import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'live' | 'gold' | 'blue' | 'danger' | 'violet';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PAD = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6 lg:p-8' };
const VAR = {
  default:     'surface',
  elevated:    'surface-elevated',
  interactive: 'surface-interactive',
  live:        'surface-live',
  gold:        'surface-gold',
  blue:        'surface-blue',
  danger:      'surface-danger',
  violet:      'surface-violet',
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ variant = 'default', padding = 'md', className, ...props }, ref) => (
    <div ref={ref} className={cn(VAR[variant], PAD[padding], className)} {...props} />
  )
);
Surface.displayName = 'Surface';
