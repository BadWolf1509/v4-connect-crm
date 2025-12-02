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
        'src/middleware/**/*.ts',
        'src/routes/auth.ts',
        'src/routes/inboxes.ts',
        'src/routes/messages.ts',
        'src/routes/pipelines.ts',
        'src/routes/teams.ts',
        'src/routes/webhooks.ts',
        'src/routes/whatsapp.ts',
        'src/routes/conversations.ts',
        'src/routes/contacts.ts',
        'src/routes/deals.ts',
        'src/routes/channels.ts',
        'src/routes/quick-replies.ts',
        'src/routes/notifications.ts',
        'src/services/analytics.service.ts',
        'src/services/evolution.service.ts',
        'src/services/meta.service.ts',
        'src/services/socket-events.service.ts',
        'src/services/storage.service.ts',
      ],
      exclude: ['src/**/*.{test,spec}.ts', 'src/__tests__/**', 'src/types/**', 'src/index.ts', 'src/env.ts'],
      thresholds: {
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
