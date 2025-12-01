import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load .env from monorepo root BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Could not load .env from ${envPath}:`, result.error.message);
}
