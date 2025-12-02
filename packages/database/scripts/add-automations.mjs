import postgres from 'postgres';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function addAutomationsTables() {
  console.log('Adding automation tables...');

  // Create enum types
  await sql`
    DO $$ BEGIN
      CREATE TYPE automation_trigger_type AS ENUM (
        'message_received',
        'conversation_opened',
        'conversation_resolved',
        'contact_created',
        'deal_stage_changed',
        'deal_created',
        'tag_added',
        'tag_removed',
        'scheduled'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE automation_status AS ENUM (
        'active',
        'paused',
        'draft'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  // Create automations table
  await sql`
    CREATE TABLE IF NOT EXISTS automations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type automation_trigger_type NOT NULL,
      trigger_config JSONB NOT NULL DEFAULT '{}',
      conditions JSONB NOT NULL DEFAULT '[]',
      actions JSONB NOT NULL DEFAULT '[]',
      status automation_status NOT NULL DEFAULT 'draft',
      priority TEXT NOT NULL DEFAULT 'normal',
      run_count TEXT NOT NULL DEFAULT '0',
      last_run_at TIMESTAMP WITH TIME ZONE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Creating automations indexes...');

  await sql`
    CREATE INDEX IF NOT EXISTS automations_tenant_idx ON automations(tenant_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS automations_status_idx ON automations(status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS automations_trigger_type_idx ON automations(trigger_type)
  `;

  // Create automation_logs table
  await sql`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      triggered_by JSONB NOT NULL DEFAULT '{}',
      actions_executed JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT,
      duration TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Creating automation_logs indexes...');

  await sql`
    CREATE INDEX IF NOT EXISTS automation_logs_automation_idx ON automation_logs(automation_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS automation_logs_tenant_idx ON automation_logs(tenant_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS automation_logs_created_at_idx ON automation_logs(created_at)
  `;

  console.log('Automation tables created successfully!');

  await sql.end();
}

addAutomationsTables().catch(console.error);
