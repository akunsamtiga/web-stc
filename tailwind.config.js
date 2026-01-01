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
          bg: '#0B1A14',
          card: '#15241C',
          hover: '#1A2A21',
        },
        accent: {
          primary: '#4ECDC4',
          secondary: '#26A69A',
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'text-blue-500',
    'text-green-500',
    'text-red-500',
    'text-yellow-500',
    'bg-blue-500/20',
    'bg-green-500/20',
    'bg-red-500/20',
    'bg-yellow-500/20',
    'hover:border-blue-500/50',
    'hover:border-green-500/50',
    'hover:border-red-500/50',
    'hover:border-yellow-500/50',
  ],
}