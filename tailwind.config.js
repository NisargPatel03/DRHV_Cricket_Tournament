/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sportsDark: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        sportsGreen: {
          DEFAULT: '#22c55e',
          500: '#22c55e',
          600: '#16a34a',
        },
        sportsGold: {
          DEFAULT: '#f59e0b',
          500: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
