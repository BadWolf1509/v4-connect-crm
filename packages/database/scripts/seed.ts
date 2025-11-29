import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Check if demo tenant already exists
    const existingTenant = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, 'v4-connect-demo'))
      .limit(1);

    if (existingTenant.length > 0) {
      console.log('✅ Demo data already exists, skipping seed.');
      await client.end();
      return;
    }

    // Create demo tenant
    console.log('Creating demo tenant...');
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: 'V4 Connect Demo',
        slug: 'v4-connect-demo',
        plan: 'growth',
      })
      .returning();

    console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12);

    // Create demo admin user
    console.log('Creating demo admin user...');
    const [adminUser] = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'admin@v4connect.com',
        passwordHash,
        name: 'Admin Demo',
        role: 'owner',
        isActive: true,
      })
      .returning();

    console.log(`✅ Admin user created: ${adminUser.email} (${adminUser.id})`);

    // Create demo agent user
    console.log('Creating demo agent user...');
    const [agentUser] = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'agent@v4connect.com',
        passwordHash,
        name: 'Agente Demo',
        role: 'agent',
        isActive: true,
      })
      .returning();

    console.log(`✅ Agent user created: ${agentUser.email} (${agentUser.id})`);

    // Create demo team
    console.log('Creating demo team...');
    const [team] = await db
      .insert(schema.teams)
      .values({
        tenantId: tenant.id,
        name: 'Atendimento',
        description: 'Equipe de atendimento ao cliente',
      })
      .returning();

    console.log(`✅ Team created: ${team.name} (${team.id})`);

    // Add users to team
    await db.insert(schema.userTeams).values([
      { userId: adminUser.id, teamId: team.id, role: 'leader' },
      { userId: agentUser.id, teamId: team.id, role: 'member' },
    ]);

    console.log('✅ Users added to team');

    // Create demo pipeline
    console.log('Creating demo pipeline...');
    const [pipeline] = await db
      .insert(schema.pipelines)
      .values({
        tenantId: tenant.id,
        name: 'Vendas',
        description: 'Pipeline de vendas principal',
      })
      .returning();

    console.log(`✅ Pipeline created: ${pipeline.name} (${pipeline.id})`);

    // Create pipeline stages
    console.log('Creating pipeline stages...');
    const stages = [
      { name: 'Novo Lead', color: '#6366f1', order: 1 },
      { name: 'Qualificação', color: '#8b5cf6', order: 2 },
      { name: 'Proposta', color: '#ec4899', order: 3 },
      { name: 'Negociação', color: '#f59e0b', order: 4 },
      { name: 'Fechado Ganho', color: '#10b981', order: 5 },
      { name: 'Fechado Perdido', color: '#ef4444', order: 6 },
    ];

    for (const stage of stages) {
      await db.insert(schema.pipelineStages).values({
        pipelineId: pipeline.id,
        name: stage.name,
        color: stage.color,
        order: stage.order,
      });
    }

    console.log('✅ Pipeline stages created');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('Demo credentials:');
    console.log('  Email: admin@v4connect.com');
    console.log('  Password: password123');
    console.log('\n  Email: agent@v4connect.com');
    console.log('  Password: password123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
