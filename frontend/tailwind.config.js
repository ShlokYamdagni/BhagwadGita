/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enables toggle-based dark mode
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fef7ee',
          100: '#fdedd4',
          200: '#fad6a5',
          300: '#f6b86c',
          400: 'color-mix(in srgb, var(--color-primary) 85%, white 15%)',
          500: 'var(--color-primary)', // Redirect standard saffron
          600: 'var(--color-primary-hover)',
          700: 'color-mix(in srgb, var(--color-primary) 70%, black 30%)',
          800: '#8c3206',
          900: '#712b07',
        },
        copper: {
          DEFAULT: '#ca6f1e',
          light: '#e59866',
          dark: '#a04000',
        },
        sandstone: {
          50: '#f9f8f5',
          100: '#f5f2eb', // Light mode bg
          200: '#eadecd', // Border light mode
          300: '#dac7ac',
          400: '#c5aa85',
          500: '#b39063',
          600: '#a37e54',
          700: '#876541',
          800: '#6f5238',
          900: '#4a3b32', // Text light mode
        },
        gold: {
          light: '#f9e79f',
          DEFAULT: 'var(--color-accent)', // Redirect gold accent
          dark: '#d4ac0d',
          soft: '#f5d0a9',
        },
        temple: {
          bg: 'var(--color-bg)',     // Redirect background
          panel: 'var(--color-panel)',  // Redirect panels
          border: 'var(--color-border)', // Redirect borders
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(241, 196, 15, 0.15)',
        'saffron-glow': '0 0 20px rgba(230, 126, 34, 0.25)',
      }
    },
  },
  plugins: [],
}
