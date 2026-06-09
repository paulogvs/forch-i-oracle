'use client';

interface FormBubblesProps {
  form: ('W' | 'D' | 'L')[];
  label?: string;
}

const colors = {
  W: 'bg-green-500 text-white',
  D: 'bg-yellow-500 text-gray-900',
  L: 'bg-red-500 text-white',
};

const labels = { W: 'V', D: 'E', L: 'D' };

export default function FormBubbles({ form, label }: FormBubblesProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <div className="flex gap-1">
        {form.map((result, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colors[result]}`}
          >
            {labels[result]}
          </div>
        ))}
        {form.length < 5 &&
          Array.from({ length: 5 - form.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10"
            />
          ))}
      </div>
    </div>
  );
}
