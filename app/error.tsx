'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="glass-card p-8 text-center max-w-md mx-auto mt-12">
      <div className="w-16 h-16 mx-auto rounded-full bg-state-danger/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-state-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Error inesperado</h2>
      <p className="text-sm text-fg-secondary mb-4">
        {error.message || 'Algo falló al cargar esta página'}
      </p>
      <button onClick={reset} className="btn-premium text-sm px-4 py-2">
        Reintentar
      </button>
    </div>
  );
}
