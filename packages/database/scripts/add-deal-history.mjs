import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function migrate() {
  console.log('Creating deal_history_type enum and deal_history table...');

  try {
    // Create enum type
    await sql`
      DO $$ BEGIN
        CREATE TYPE deal_history_type AS ENUM (
          'created',
          'stage_changed',
          'status_changed',
          'assignee_changed',
          'value_changed',
          'field_updated',
          'note_added',
          'activity_added'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✓ Enum deal_history_type created (or already exists)');

    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS deal_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type deal_history_type NOT NULL,
        previous_value JSONB,
        new_value JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✓ Table deal_history created');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS deal_history_deal_idx ON deal_history(deal_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS deal_history_type_idx ON deal_history(type);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS deal_history_created_at_idx ON deal_history(created_at);
    `;
    console.log('✓ Indexes created');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
