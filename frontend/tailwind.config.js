/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        // ── Verdant Green Technology Palette ──
        verdant: {
          emerald: '#6fa350',
          deep: '#4f7a38',
          gold: '#8fc46a',
          soft: '#dcedc9',
          ivory: '#ffffff',
          ivory2: '#fbfbf9',
          ivory3: '#f3f6f0',
          ink: '#25352b',
          muted: '#6d7d70',
          border: 'rgba(111,163,80,0.22)',
          dark: '#142018',
          darkCard: '#1a291f',
          darkBorder: 'rgba(111,163,80,0.3)',
        },
        // Backwards compatible semantic tokens
        eco: {
          DEFAULT: '#6fa350',
          50: '#f4f9f0',
          100: '#e6f2dc',
          200: '#d0e7be',
          300: '#8fc46a',
          400: '#6fa350',
          500: '#4f7a38',
          600: '#3a5d28',
        },
        warn: {
          DEFAULT: '#d9822b',
          50: '#fffbf5',
          100: '#fef3e2',
          200: '#fce4c0',
          300: '#f7b05b',
          400: '#d9822b',
          500: '#b7651a',
        },
        danger: {
          DEFAULT: '#c94a44',
          50: '#fdf5f5',
          100: '#fce8e7',
          200: '#fad3d1',
          300: '#ee7772',
          400: '#c94a44',
          500: '#a6332e',
        },
        info: {
          DEFAULT: '#4a8fa8',
          50: '#f3f8fa',
          100: '#e4f1f5',
          200: '#cde4ec',
          300: '#72b3cc',
          400: '#4a8fa8',
          500: '#346f86',
        },
      },
      boxShadow: {
        verdant: '0 1px 2px rgba(37,53,43,0.04), 0 8px 24px rgba(37,53,43,0.06)',
        'verdant-lg': '0 4px 12px rgba(37,53,43,0.08), 0 16px 36px rgba(37,53,43,0.12)',
        'eco-sm': '0 0 0 1px rgba(111,163,80,0.2), 0 1px 4px rgba(0,0,0,0.04)',
        eco: '0 0 0 1px rgba(111,163,80,0.25), 0 4px 14px rgba(79,122,56,0.15)',
        'card-hover': '0 6px 24px rgba(79,122,56,0.15), 0 0 0 1px rgba(111,163,80,0.3)',
      },
      animation: {
        'live-pulse': 'livePulse 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.25s ease-out both',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
