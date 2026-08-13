/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VOM brand colors
        navy: '#0B3558',
        orange: '#FF6B35',
        teal: '#00A896',
        // Neutral grays
        surface: '#F8F9FA',
        border: '#E0E0E0',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
