import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    'C:/Users/home/Documents/creacion de ideas/semafora-metrics/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        semafora: {
          red: '#e20613',
          yellow: '#ffdd00',
          green: '#00973a',
          bg: '#09090b',
          surface: '#111113',
          surface2: '#18181b',
          surface3: '#1f1f23',
          border: '#27272a',
          border2: '#3f3f46',
          text: '#fafafa',
          muted: '#a1a1aa',
          muted2: '#52525b',
        },
        platform: {
          meta: '#1877F2',
          google: '#4285F4',
          tiktok: '#FF0050',
          instagram: '#E1306C',
          linkedin: '#0A66C2',
        },
      },
      fontFamily: {
        bebas: ['var(--font-bebas)', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
