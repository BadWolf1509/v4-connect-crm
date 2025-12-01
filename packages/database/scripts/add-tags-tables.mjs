import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    console.log('Creating tags tables...');

    // Create tags table
    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6B7280',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    // Create contact_tags junction table
    await sql`
      CREATE TABLE IF NOT EXISTS contact_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(contact_id, tag_id)
      );
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS tags_tenant_idx ON tags(tenant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);`;
    await sql`CREATE INDEX IF NOT EXISTS contact_tags_contact_idx ON contact_tags(contact_id);`;
    await sql`CREATE INDEX IF NOT EXISTS contact_tags_tag_idx ON contact_tags(tag_id);`;

    console.log('Tags tables created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

migrate().catch(console.error);
