/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
    './index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── ProxBalance custom palette ──────────────────────────────
        // Role-based tokens. Use directly: bg-pb-surface, text-pb-text,
        // border-pb-border, etc. Each has a `-dark` counterpart used with
        // `dark:` variants.
        pb: {
          // page + surfaces
          'bg':            '#F4F6FA',
          'bg-dark':       '#0B1220',
          'surface':       '#FFFFFF',
          'surface-dark':  '#131C33',
          'surface2':      '#F8FAFC',
          'surface2-dark': '#182441',
          'hover':         '#F1F5F9',
          'hover-dark':    '#1B2747',
          'track':         '#E5E9F0',
          'track-dark':    '#1E2A4B',

          // borders
          'border':         '#E2E8F0',
          'border-dark':    '#20304F',
          'border-strong':  '#CBD5E1',
          'border-strong-dark': '#2C3E64',

          // text
          'text':       '#0F172A',
          'text-dark':  '#E5ECF7',
          'text2':      '#475569',
          'text2-dark': '#A4B2C9',
          'text3':      '#94A3B8',
          'text3-dark': '#6A7B98',

          // brand accent (same hue across modes; lifted in dark)
          'accent':         '#4F6EF7',
          'accent-hover':   '#3F5BE0',
          'accent-dark':    '#7A98FF',
          'accent2':        '#7C5CFF',
          'accent2-dark':   '#9F86FF',
        },

        // legacy gray scale tweaks kept for compat
        gray: { 850: '#1a2332', 950: '#0f1724' },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'pb-card':       '0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)',
        'pb-card-hover': '0 4px 12px -2px rgba(15,23,42,.10), 0 2px 4px rgba(15,23,42,.06)',
        'pb-modal':      '0 20px 40px -10px rgba(15,23,42,.30), 0 8px 16px rgba(15,23,42,.10)',
      },
    },
  },
  plugins: [],
};
