/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'neo-bg': '#FFDEE9',
        'neo-yellow': '#FFD600',
        'neo-green': '#00E676',
        'neo-blue': '#2979FF',
        'neo-pink': '#FF4081',
        'neo-black': '#1a1a1a',
      },
      boxShadow: {
        'neo': '5px 5px 0px 0px #000000',
        'neo-hover': '8px 8px 0px 0px #000000',
        'neo-sm': '3px 3px 0px 0px #000000',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      }
    },
  },
  plugins: [],
}
