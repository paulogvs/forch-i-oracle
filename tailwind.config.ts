import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        'bg-primary': '#050B14',
        'bg-secondary': '#0A1628',
        'bg-tertiary': '#111D30',
        'bg-elevated': '#132238',

        // Accent palette
        'accent-gold': '#D4AF37',
        'accent-gold-dim': '#8A7020',
        'accent-blue': '#2B7FFF',
        'accent-cyan': '#00D4FF',
        'accent-emerald': '#00C853',
        'accent-crimson': '#FF3D57',
        'accent-amber': '#FF8C42',

        // Text hierarchy
        'text-primary': '#FFFFFF',
        'text-secondary': '#A8B5C4',
        'text-tertiary': '#6B7B8E',
        'text-muted': '#4A5A6E',

        // FORCH.i brand (legacy compat)
        forch: {
          gold: '#D4AF37',
          dark: '#050B14',
          green: '#00C853',
          accent: '#FFD700',
        },

        // WC2026 palette (legacy compat)
        wc: {
          navy: '#050B14',
          'navy-light': '#111D30',
          blue: '#2B7FFF',
          'blue-glow': '#5A9FFF',
          amber: '#FF8C42',
          silver: '#A8B5C4',
          white: '#FFFFFF',
          'white-soft': '#F0F2F5',
          field: '#1A472A',
          'field-light': '#236B3E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'card-sm': '12px',
        'pill': '9999px',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'seal-stamp': 'sealStamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'breathe': 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(43, 127, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(43, 127, 255, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        sealStamp: {
          '0%': { opacity: '0', transform: 'scale(1.8) rotate(-8deg)' },
          '60%': { opacity: '1', transform: 'scale(0.95) rotate(1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
