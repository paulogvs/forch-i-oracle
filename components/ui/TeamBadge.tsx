interface TeamBadgeProps {
  name: string;
  code?: string;
  flag: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const SIZES = {
  sm: { flag: 'text-2xl', name: 'text-xs', code: 'text-[10px]' },
  md: { flag: 'text-3xl', name: 'text-sm', code: 'text-[10px]' },
  lg: { flag: 'text-4xl', name: 'text-base', code: 'text-xs' },
  xl: { flag: 'text-5xl md:text-6xl', name: 'text-base md:text-lg', code: 'text-xs' },
};

/**
 * Team badge with flag emoji, name, and FIFA code.
 * Apple Sports-style clean team display.
 */
export default function TeamBadge({
  name,
  code,
  flag,
  size = 'md',
  align = 'center',
  className = '',
}: TeamBadgeProps) {
  const s = SIZES[size];
  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';

  return (
    <div className={`flex flex-col items-center ${alignClass} ${className}`}>
      <div className={`${s.flag} mb-1 animate-scale-in`} role="img" aria-label={`Bandera de ${name}`}>
        {flag}
      </div>
      <div className={`${s.name} font-semibold text-white truncate max-w-[120px]`}>
        {name}
      </div>
      {code && (
        <div className={`${s.code} font-mono text-text-tertiary mt-0.5`}>
          {code}
        </div>
      )}
    </div>
  );
}
