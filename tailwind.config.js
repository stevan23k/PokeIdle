/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          dark: 'var(--color-brand-dark)',
          deep: 'var(--color-brand-deep)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          dark: 'var(--color-surface-dark)',
          alt: 'var(--color-surface-alt)',
          'alt-dark': 'var(--color-surface-alt-dark)',
          light: 'var(--color-surface-light)',
        },
        foreground: {
          DEFAULT: 'var(--color-foreground)',
          dark: 'var(--color-foreground-dark)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          dark: 'var(--color-muted-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          blue: 'var(--color-accent-blue)',
        },
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        border: {
          DEFAULT: 'var(--color-border)',
          dark: 'var(--color-border-dark)',
        },
        hp: {
          DEFAULT: 'var(--color-hp)',
          low: 'var(--color-hp-low)',
          critical: 'var(--color-hp-critical)',
        },
        xp: 'var(--color-xp)',
      },
      fontFamily: {
        display: ['"Press Start 2P"', 'monospace'],
        body: ['"IBM Plex Mono"', 'monospace'],
        ui: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        pixel: 'var(--shadow-pixel)',
        'pixel-sm': 'var(--shadow-pixel-sm)',
        'glow-red': 'var(--shadow-glow-red)',
        'glow-gold': 'var(--shadow-glow-gold)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)',
      },
    }
  },
  plugins: [],
}
