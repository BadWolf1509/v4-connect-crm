import { config } from 'dotenv';
import postgres from 'postgres';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function addTenantIdToMessages() {
  try {
    console.log('Checking if tenant_id column exists in messages table...');

    // Check if column exists
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'tenant_id'
    `;

    if (columnCheck.length > 0) {
      console.log('tenant_id column already exists in messages table.');
      await sql.end();
      return;
    }

    console.log('Adding tenant_id column to messages table...');

    // Get the first tenant_id from conversations as default
    // Since messages.conversation_id references conversations, we can derive tenant_id from there

    // Step 1: Add column as nullable first
    await sql`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS tenant_id UUID
    `;
    console.log('Column added as nullable.');

    // Step 2: Update existing rows with tenant_id from conversations
    await sql`
      UPDATE messages m
      SET tenant_id = c.tenant_id
      FROM conversations c
      WHERE m.conversation_id = c.id
      AND m.tenant_id IS NULL
    `;
    console.log('Existing rows updated with tenant_id from conversations.');

    // Step 3: Make column NOT NULL
    await sql`
      ALTER TABLE messages
      ALTER COLUMN tenant_id SET NOT NULL
    `;
    console.log('Column set to NOT NULL.');

    // Step 4: Add foreign key constraint
    await sql`
      ALTER TABLE messages
      ADD CONSTRAINT messages_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `;
    console.log('Foreign key constraint added.');

    // Step 5: Add index
    await sql`
      CREATE INDEX IF NOT EXISTS messages_tenant_idx ON messages(tenant_id)
    `;
    console.log('Index created.');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

addTenantIdToMessages();
