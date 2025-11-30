import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/__tests__/**',
        'src/**/index.ts',
        'src/types/**',
        // Services require database integration tests - excluded from unit test coverage
        'src/services/channels.service.ts',
        'src/services/contacts.service.ts',
        'src/services/conversations.service.ts',
        'src/services/deals.service.ts',
        'src/services/inboxes.service.ts',
        'src/services/messages.service.ts',
        'src/services/pipelines.service.ts',
        'src/services/teams.service.ts',
        'src/services/tenants.service.ts',
        'src/services/users.service.ts',
        // Lib requires Redis/DB connection
        'src/lib/db.ts',
        'src/lib/redis.ts',
      ],
      thresholds: {
        // Unit test coverage for routes, middleware, and testable services
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
