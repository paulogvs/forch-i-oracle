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
          primary: 'var(--accent-primary)',
          premium: 'var(--accent-premium)',
        },
        state: {
          success: 'var(--state-success)',
          warning: 'var(--state-warning)',
          danger:  'var(--state-danger)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '14px', xl: '20px',
      },
      maxWidth: {
        page: '1280px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
