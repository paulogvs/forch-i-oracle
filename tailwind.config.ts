import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas:   'var(--canvas)',
        surface:  'var(--surface)',
        elevated: 'var(--elevated)',
        overlay:  'var(--overlay)',
        raised:   'var(--raised)',

        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus:  'var(--border-focus)',
        },
        fg: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          disabled:  'var(--text-disabled)',
        },
        accent: {
          primary:   'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          premium:   'var(--accent-premium)',
          emerald:   'var(--accent-emerald)',
        },
        state: {
          success: 'var(--state-success)',
          warning: 'var(--state-warning)',
          danger:  'var(--state-danger)',
        },
        tint: {
          blue:   'var(--surface-blue)',
          green:  'var(--surface-green)',
          gold:   'var(--surface-gold)',
          red:    'var(--surface-red)',
          violet: 'var(--surface-violet)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px', xl: '24px',
      },
      maxWidth: {
        page: '1280px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
