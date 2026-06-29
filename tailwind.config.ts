import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system: Dark OLED + Verde WhatsApp
        brand: {
          bg: '#020617',
          surface: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          primary: '#22C55E',   // verde WhatsApp / IMPULSO
          'primary-dark': '#16A34A',
          'primary-glow': 'rgba(34,197,94,0.15)',
          text: '#F8FAFC',
          muted: '#94A3B8',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Fira Sans', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(34,197,94,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-green': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
