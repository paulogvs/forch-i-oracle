'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'premium' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const SIZE = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
};

const VARIANT = {
  primary:   'bg-accent-primary text-white hover:brightness-110 active:brightness-95 shadow-[0_2px_12px_rgba(43,127,255,0.25)]',
  secondary: 'bg-elevated text-fg-primary border border-border-subtle hover:border-border-strong hover:bg-overlay',
  ghost:     'bg-transparent text-fg-secondary hover:text-fg-primary hover:bg-elevated',
  premium:   'text-canvas bg-accent-premium hover:brightness-110 shadow-[0_2px_12px_rgba(212,175,55,0.3)] font-semibold',
  danger:    'bg-state-danger text-white hover:brightness-110',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-all duration-200 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        SIZE[size], VARIANT[variant], className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
