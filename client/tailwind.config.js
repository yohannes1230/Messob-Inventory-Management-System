/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mesob: {
          gold: '#D4A373',
          'gold-dark': '#A07855',
          bronze: '#8A5A36',
          cream: '#FAEDCD',
          sand: '#FEFAE0',
          dark: '#1E2227',
          card: '#282C34',
          border: '#3E4451',
        },
        status: {
          available: '#2E7D32',
          active: '#1565C0',
          warning: '#ED6C02',
          danger: '#C62828',
          disposed: '#757575',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Ethiopic', 'sans-serif'],
        ethiopic: ['Noto Sans Ethiopic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
