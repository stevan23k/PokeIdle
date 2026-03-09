/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand)",
          dark: "var(--color-brand-dark)",
          deep: "var(--color-brand-deep)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          dark: "var(--color-surface-dark)",
          alt: "var(--color-surface-alt)",
          "alt-dark": "var(--color-surface-alt-dark)",
          light: "var(--color-surface-light)",
        },
        foreground: {
          DEFAULT: "var(--color-foreground)",
          dark: "var(--color-foreground-dark)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          dark: "var(--color-muted-dark)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          blue: "var(--color-accent-blue)",
        },
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        border: {
          DEFAULT: "var(--color-border)",
          dark: "var(--color-border-dark)",
        },
        hp: {
          DEFAULT: "var(--color-hp)",
          low: "var(--color-hp-low)",
          critical: "var(--color-hp-critical)",
        },
        xp: "var(--color-xp)",
      },
      fontFamily: {
        display: ['"Press Start 2P"', "monospace"],
        body: ['"IBM Plex Mono"', "monospace"],
        ui: ["Inter", "sans-serif"],
      },
      boxShadow: {
        pixel: "var(--shadow-pixel)",
        "pixel-sm": "var(--shadow-pixel-sm)",
        "pixel-active": "var(--shadow-pixel-active)",
        "glow-red": "var(--shadow-glow-red)",
        "glow-gold": "var(--shadow-glow-gold)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
      },
      keyframes: {
        floating: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "star-fall": {
          "0%": { transform: "translate(-100%, -100%)", opacity: "0" },
          "20%": { opacity: "1" },
          "80%": { opacity: "1" },
          "100%": { transform: "translate(100vw, 100vh)", opacity: "0" },
        },
        "impact-flash": {
          "0%": { transform: "scale(1)", opacity: "0" },
          "20%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        "crack-spread": {
          "0%": { height: "0%", opacity: "0", filter: "blur(10px)" },
          "20%": { height: "100%", opacity: "1", filter: "blur(5px)" },
          "80%": { width: "2px", opacity: "1", filter: "blur(2px)" },
          "100%": { width: "100vw", opacity: "1", filter: "blur(0px)" },
        },
      },
      animation: {
        floating: "floating 3s ease-in-out infinite",
        "star-fall": "star-fall 0.8s ease-in-out forwards",
        "impact-flash": "impact-flash 0.5s ease-out forwards",
        "crack-spread":
          "crack-spread 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
