import 'dotenv/config';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);

// Configuration - edit these values
const TENANT_ID = '75aceb6f-a21c-4ee8-aefb-adc1aed93310'; // V4 Connect Demo
const INSTANCE_NAME = 'wellington_ribeiro'; // Evolution API instance name
const CHANNEL_NAME = 'WhatsApp Wellington';

async function main() {
  const channelId = randomUUID();

  const config = {
    instanceName: INSTANCE_NAME,
    evolutionApiUrl: 'https://evo.fluxocerto.dev.br',
  };

  console.log('Creating channel...');
  console.log('Tenant ID:', TENANT_ID);
  console.log('Instance:', INSTANCE_NAME);
  console.log('Channel ID:', channelId);

  await sql`
    INSERT INTO channels (id, tenant_id, name, type, provider, config, is_active, created_at, updated_at)
    VALUES (
      ${channelId},
      ${TENANT_ID},
      ${CHANNEL_NAME},
      'whatsapp',
      'evolution',
      ${JSON.stringify(config)},
      true,
      NOW(),
      NOW()
    )
  `;

  console.log('\n✅ Channel created successfully!');

  // Verify
  const channels = await sql`SELECT id, name, type, provider, config, is_active FROM channels WHERE tenant_id = ${TENANT_ID}`;
  console.table(channels);

  await sql.end();
}

main().catch(console.error);
