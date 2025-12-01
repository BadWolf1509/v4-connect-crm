import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    console.log('Creating invites table...');

    // Create invite_status enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create invites table
    await sql`
      CREATE TABLE IF NOT EXISTS invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'agent',
        token TEXT NOT NULL UNIQUE,
        status invite_status NOT NULL DEFAULT 'pending',
        invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        accepted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_tenant_id ON invites(tenant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);`;

    console.log('Invites table created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

migrate().catch(console.error);
