interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  className?: string;
}

/**
 * Section header with title, optional subtitle, and gradient divider.
 * Apple Sports-style minimal section divider.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`mb-6 animate-fade-in-up ${className}`}>
      <div className="flex items-center gap-3 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="text-sm text-fg-secondary">{subtitle}</p>
      )}
      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
