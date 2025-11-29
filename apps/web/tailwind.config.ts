import baseConfig from '@v4/tailwind-config';
import type { Config } from 'tailwindcss';

export default {
  ...baseConfig,
  content: [
    './src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
