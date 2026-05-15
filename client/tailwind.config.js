/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#fafaf8',
        surface: '#f5f4f0',
        surface2: '#eeecea',
        border: '#e0ddd8',
        borderDark: '#c8c4be',
        textPrimary: '#1a1816',
        textSecondary: '#6b6760',
        textMuted: '#9E9891',
        accent: '#ff6b35',
        accent2: '#7c3aed',
        accent3: '#06d6a0',
        gold: '#f59e0b',
      },
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        body: ['Satoshi', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        marquee: 'marquee 20s linear infinite',
      },
    },
  },
  plugins: [],
};
