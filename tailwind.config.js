/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Trebuchet MS', 'sans-serif'],
      },
      colors: {
        night: {
          50: '#1a0a2e',
          100: '#16041f',
          200: '#0d0015',
          300: '#070010',
        },
        moon: {
          100: '#f5e6c8',
          200: '#e8d5a3',
          300: '#d4b96a',
        },
        blood: {
          400: '#c0392b',
          500: '#96281b',
          600: '#6e1a10',
        },
        forest: {
          400: '#27ae60',
          500: '#1e8449',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 2s infinite',
        'moon-rise': 'moonRise 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        moonRise: {
          '0%': { transform: 'translateY(40px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'night-gradient': 'linear-gradient(to bottom, #070010, #1a0a2e, #0d0015)',
        'day-gradient': 'linear-gradient(to bottom, #87CEEB, #98D8C8, #7EC8A4)',
      }
    },
  },
  plugins: [],
}
