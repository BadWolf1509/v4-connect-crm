import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/schema/tenants.ts',
        'src/schema/users.ts',
        'src/schema/campaigns.ts',
        'src/schema/channels.ts',
        'src/schema/messages.ts',
        'src/schema/notifications.ts',
        'src/schema/index.ts',
      ],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/__tests__/**',
        'src/client.ts', // Requires database connection
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
