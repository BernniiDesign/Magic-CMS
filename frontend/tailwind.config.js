/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a26',
          600: '#2e2e40',
          500: '#3a3a50',
        },
        primary: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0ea5e9',
          700: '#0284c7',
          900: '#082f49',
        },
        // WoW-inspired colors
        wow: {
          gold: '#ffd700',      // Legendary item color
          ice: '#88d4f5',       // Wrath of the Lich King ice blue
          blue: '#4a9eff',      // WoW blue
          silver: '#c0c0c0',    // Silver/Gray for epics
          purple: '#a335ee',    // Epic item color
          green: '#1eff00',     // Uncommon item color
        }
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
