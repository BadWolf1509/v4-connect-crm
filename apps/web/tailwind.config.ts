import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['var(--font-montserrat)'],
        bebas: ['var(--font-bebas)'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // V4 Company Brand Colors
        'v4-red': {
          400: '#E30613', // Lighter variant for text
          500: '#E30613', // Main brand red (RGB: 229, 9, 20)
          600: '#B20710', // Dark red variant (RGB: 178, 7, 16)
          700: '#80050B', // Deeper red (RGB: 128, 5, 11)
          800: '#400306', // Darkest red (RGB: 64, 3, 6)
        },
        'v4-gray': {
          100: '#E5E5E5', // Light gray (RGB: 229, 229, 229)
          200: '#CCCCCC', // Medium light gray (RGB: 204, 204, 204)
          300: '#B3B3B3', // Neutral gray (RGB: 179, 179, 179)
          700: '#333333', // Dark gray (RGB: 51, 51, 51)
          800: '#262626', // Darker gray (RGB: 38, 38, 38)
          900: '#1A1A1A', // Near black (RGB: 26, 26, 26)
          950: '#000000', // Pure black
        },
        // V4 Company Secondary Colors
        'v4-green': '#52CC5A', // Green accent (RGB: 82, 204, 90)
        'v4-yellow': '#FFC02A', // Yellow accent (RGB: 255, 192, 42)
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
