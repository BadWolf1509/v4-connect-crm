import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: [
    'drizzle-orm',
    'drizzle-orm/pg-core',
    'drizzle-orm/postgres-js',
    '@neondatabase/serverless',
    'postgres',
  ],
});
