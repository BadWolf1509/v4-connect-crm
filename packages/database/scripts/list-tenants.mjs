import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  console.log('=== TENANTS ===');
  const tenants = await sql`SELECT id, name, slug FROM tenants`;
  console.table(tenants);

  console.log('\n=== CHANNELS ===');
  const channels =
    await sql`SELECT id, tenant_id, name, type, provider, is_active, config FROM channels`;
  console.table(channels);

  console.log('\n=== USERS ===');
  const users = await sql`SELECT id, tenant_id, name, email, role FROM users LIMIT 10`;
  console.table(users);

  await sql.end();
}

main().catch(console.error);
