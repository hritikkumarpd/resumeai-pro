/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          primary:   '#080920',
          secondary: '#0D0F2E',
          card:      '#111338',
          hover:     '#161A44',
        },
        purple: {
          DEFAULT: '#7C3AED',
          light:   '#A78BFA',
          dark:    '#5B21B6',
        },
        cyan: {
          brand:   '#22D3EE',
          dark:    '#0891B2',
        },
        border: {
          DEFAULT: 'rgba(124,58,237,0.25)',
          hover:   'rgba(124,58,237,0.6)',
          glass:   'rgba(255,255,255,0.07)',
        },
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        'grad-text':    'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
        'grad-card':    'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 100%)',
        'grad-hero':    'radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.35) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(6,182,212,0.25) 0%, transparent 50%)',
        'grid-lines':   'linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)',
      },
      boxShadow: {
        'glow':      '0 0 40px rgba(124,58,237,0.4)',
        'glow-lg':   '0 0 60px rgba(124,58,237,0.5)',
        'glow-cyan': '0 0 40px rgba(34,211,238,0.3)',
        'card':      '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.25)',
      },
      animation: {
        'float-1':    'float1 4s ease-in-out infinite',
        'float-2':    'float2 4s ease-in-out infinite 0.5s',
        'float-3':    'float3 4s ease-in-out infinite 1s',
        'pulse-dot':  'pulseDot 2s infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'gradient':   'gradientShift 4s linear infinite',
        'spin-slow':  'spin 8s linear infinite',
        'bounce-sm':  'bounceSm 1s infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'scanner':    'scanner 2.5s ease-in-out forwards',
        'fade-up':    'fadeUp 0.6s ease forwards',
        'slide-down': 'slideDown 0.3s ease forwards',
        'scale-in':   'scaleIn 0.4s ease forwards',
      },
      keyframes: {
        float1: {
          '0%,100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%':     { transform: 'translateY(-12px) rotate(1deg)' },
        },
        float2: {
          '0%,100%': { transform: 'translateY(0) rotate(1deg)' },
          '50%':     { transform: 'translateY(-10px) rotate(-1deg)' },
        },
        float3: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        pulseDot: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.6)' },
          '50%':     { boxShadow: '0 0 0 6px rgba(16,185,129,0)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 20px rgba(124,58,237,0.4)' },
          '50%':     { boxShadow: '0 0 50px rgba(124,58,237,0.7), 0 0 80px rgba(34,211,238,0.3)' },
        },
        gradientShift: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        bounceSm: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        scanner: {
          '0%':   { transform: 'translateY(-100%)', opacity: 0 },
          '10%':  { opacity: 1 },
          '90%':  { opacity: 1 },
          '100%': { transform: 'translateY(100%)', opacity: 0 },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(24px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: 0, transform: 'translateY(-12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.93)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
