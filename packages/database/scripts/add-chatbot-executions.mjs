import postgres from 'postgres';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function addChatbotExecutionsTable() {
  console.log('Adding chatbot_executions table...');

  await sql`
    CREATE TABLE IF NOT EXISTS chatbot_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      current_node_id UUID REFERENCES flow_nodes(id) ON DELETE SET NULL,
      variables JSONB NOT NULL DEFAULT '{}',
      message_history JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'waiting', 'completed', 'failed')),
      started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      error TEXT,
      UNIQUE(chatbot_id, conversation_id)
    )
  `;

  console.log('Creating indexes...');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chatbot_executions_conversation
    ON chatbot_executions(conversation_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chatbot_executions_status
    ON chatbot_executions(status) WHERE status IN ('running', 'waiting')
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chatbot_executions_tenant
    ON chatbot_executions(tenant_id)
  `;

  console.log('chatbot_executions table created successfully!');

  await sql.end();
}

addChatbotExecutionsTable().catch(console.error);
