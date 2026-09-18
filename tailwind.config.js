/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Cyberpunk Neon Color Tokens
        neonCyan: '#00f0ff',
        neonPurple: '#b026ff',
        neonPink: '#ff007f',
        neonGreen: '#00ff9d',
        neonAmber: '#ffbe0b',
        cyanGlow: '#06b6d4',
        emeraldGlow: '#10b981',
        darkBg: '#090d16',
        darkCard: 'rgba(17, 24, 39, 0.75)',
        darkBorder: 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4), inset 0 0 10px rgba(0, 240, 255, 0.2)',
        'neon-purple': '0 0 15px rgba(176, 38, 255, 0.4), inset 0 0 10px rgba(176, 38, 255, 0.2)',
        'neon-pink': '0 0 15px rgba(255, 0, 127, 0.4), inset 0 0 10px rgba(255, 0, 127, 0.2)',
        'neon-green': '0 0 15px rgba(0, 255, 157, 0.4), inset 0 0 10px rgba(0, 255, 157, 0.2)',
        '3d-cyan': '0 0 20px rgba(0, 240, 255, 0.35), 0 4px 0 rgba(0, 180, 216, 0.8)',
        '3d-purple': '0 0 20px rgba(176, 38, 255, 0.35), 0 4px 0 rgba(147, 51, 234, 0.8)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float3d': 'float3d 5s ease-in-out infinite',
        'neonPulse': 'neonPulse 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float3d: {
          '0%, 100%': { transform: 'perspective(1000px) translateY(0px) rotateX(0deg) rotateY(0deg)' },
          '50%': { transform: 'perspective(1000px) translateY(-10px) rotateX(3deg) rotateY(-3deg)' },
        },
        neonPulse: {
          '0%': { filter: 'drop-shadow(0 0 4px rgba(0, 240, 255, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 16px rgba(0, 240, 255, 0.8))' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
