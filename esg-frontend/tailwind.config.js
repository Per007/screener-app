/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f5ff',
          100: '#e0eaff',
          200: '#c3d9ff',
          300: '#a6c8ff',
          400: '#8ab7ff',
          500: '#6ea6ff',
          600: '#1a2332',  // Primary navy blue
          700: '#151c29',
          800: '#101520',
          900: '#0b0e17',
        },
        gold: {
          50: '#fdfaf6',
          100: '#fbf5ee',
          200: '#f8eddd',
          300: '#f5e5cc',
          400: '#f2ddbb',
          500: '#efd5aa',
          600: '#d4a574',  // Gold accent
          700: '#b88e5a',
          800: '#9c7740',
          900: '#806026',
        },
      },
    },
  },
  plugins: [],
}
