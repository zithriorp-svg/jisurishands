import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple password hashing function
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Seeding RBAC users...');

  // Create admin user with the master password
  const adminPassword = 'Davidcaleb52019***';
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      // Update password hash and ensure ADMIN role
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
      name: 'System Administrator',
    },
    create: {
      username: 'admin',
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
      name: 'System Administrator',
    },
  });

  console.log(`✅ Admin user created/updated: ${adminUser.username} (Role: ${adminUser.role})`);

  // Create a default agent user for testing
  const agentPassword = 'agent123';
  const agentUser = await prisma.user.upsert({
    where: { username: 'agent' },
    update: {
      passwordHash: hashPassword(agentPassword),
      role: 'AGENT',
      name: 'Field Agent',
    },
    create: {
      username: 'agent',
      passwordHash: hashPassword(agentPassword),
      role: 'AGENT',
      name: 'Field Agent',
    },
  });

  console.log(`✅ Agent user created/updated: ${agentUser.username} (Role: ${agentUser.role})`);
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   ADMIN: username=admin, password=Davidcaleb52019***');
  console.log('   AGENT: username=agent, password=agent123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
