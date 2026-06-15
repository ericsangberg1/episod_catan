import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#e7d3a1',
        wheat: '#f1c84b',
        wood: '#5b7a3a',
        brick: '#a8412a',
        sheep: '#cfe3a0',
        ore: '#6b6b78',
        ocean: '#1f4e6b',
        parchment: '#f6ecd2',
        ink: '#221a10',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
