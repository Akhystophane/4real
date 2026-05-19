import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PP Neue Montreal"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serifAccent: ['"PP Mondwest"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
