import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-fade">
      {icon && <div className="text-fg-tertiary mb-4">{icon}</div>}
      <h3 className="h-card text-fg-primary mb-1">{title}</h3>
      {description && <p className="t-meta max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
