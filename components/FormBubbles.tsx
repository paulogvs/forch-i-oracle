'use client';

interface FormBubblesProps {
  form: ('W' | 'D' | 'L')[];
  label?: string;
}

const colors = {
  W: 'bg-accent-emerald text-white',
  D: 'bg-accent-amber text-bg-primary',
  L: 'bg-accent-crimson text-white',
};

const labels = { W: 'V', D: 'E', L: 'D' };

export default function FormBubbles({ form, label }: FormBubblesProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] text-text-muted font-medium">{label}</span>}
      <div className="flex gap-1">
        {form.map((result, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${colors[result]}`}
          >
            {labels[result]}
          </div>
        ))}
        {form.length < 5 &&
          Array.from({ length: 5 - form.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06]"
            />
          ))}
      </div>
    </div>
  );
}
