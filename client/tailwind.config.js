/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Section 5.2: Brand Primary (trust, government blue)
        'am-primary': {
          50: '#eef6ff',
          100: '#d9ecff',
          300: '#7ab8f5',
          500: '#1668c1',
          600: '#10529b',
          700: '#0b3d75',
          900: '#062347',
        },
        // Section 5.2: Brand Accent (teal-green)
        'am-accent': {
          500: '#0ea88c',
          700: '#076b58',
        },
        // Section 5.2: Ethiopian Heritage (sparing accents only)
        'am-heritage': {
          green: '#078930',
          yellow: '#fcdd09',
          red: '#da121a',
        },
        // Section 5.2: Neutrals
        'am-gray': {
          0: '#ffffff',
          50: '#f7f8fa',
          100: '#eef0f3',
          200: '#e1e4e9',
          400: '#9aa2af',
          600: '#5c6472',
          800: '#2b303b',
          900: '#171a21',
        },
        // Section 5.2: Semantic Status
        status: {
          info: '#1668c1',
          neutral: '#5c6472',
          available: '#0ea88c',
          pending: '#d69b1f',
          active: '#17824e',
          warning: '#d97706',
          danger: '#da121a',
          terminal: '#6b7280',
        },
        // Section 5.2: Dark mode surfaces
        'am-dark': {
          bg: '#0f1319',
          surface: '#171c24',
          border: '#262c37',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
