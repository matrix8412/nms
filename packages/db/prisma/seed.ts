import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@kinet.sk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin12345678';

async function seedRoles() {
  const builtInRoles = [
    {
      name: 'USER',
      description: 'Default user role with read-only access',
      builtIn: true,
      permissions: [
        { resource: 'devices', action: 'read' },
        { resource: 'device-groups', action: 'read' },
        { resource: 'events', action: 'read' },
      ],
    },
    {
      name: 'ADMIN',
      description: 'Full administrative access to all resources',
      builtIn: true,
      permissions: [
        { resource: 'devices', action: 'read' },
        { resource: 'devices', action: 'create' },
        { resource: 'devices', action: 'update' },
        { resource: 'devices', action: 'delete' },
        { resource: 'device-groups', action: 'read' },
        { resource: 'device-groups', action: 'create' },
        { resource: 'device-groups', action: 'update' },
        { resource: 'device-groups', action: 'delete' },
        { resource: 'events', action: 'read' },
        { resource: 'events', action: 'create' },
        { resource: 'events', action: 'update' },
        { resource: 'events', action: 'delete' },
        { resource: 'audit-logs', action: 'read' },
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'update' },
        { resource: 'users', action: 'delete' },
        { resource: 'settings', action: 'read' },
        { resource: 'settings', action: 'update' },
        { resource: 'integrations', action: 'read' },
        { resource: 'integrations', action: 'create' },
        { resource: 'integrations', action: 'update' },
        { resource: 'integrations', action: 'delete' },
        { resource: 'catalogs', action: 'read' },
        { resource: 'catalogs', action: 'create' },
        { resource: 'catalogs', action: 'update' },
        { resource: 'catalogs', action: 'delete' },
      ],
    },
  ];

  for (const role of builtInRoles) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (existing) {
      console.log(`Role already exists: ${role.name}`);
      continue;
    }

    await prisma.role.create({
      data: {
        name: role.name,
        description: role.description,
        builtIn: role.builtIn,
        permissions: {
          create: role.permissions,
        },
      },
    });
    console.log(`Role created: ${role.name}`);
  }
}

async function seedIntegrations() {
  const icmpConfig = await prisma.integrationConfig.findUnique({
    where: { provider: 'icmp' },
  });
  if (!icmpConfig) {
    await prisma.integrationConfig.create({
      data: {
        provider: 'icmp',
        enabled: true,
        settings: {
          intervalSec: 120,
          timeoutSec: 3,
          retries: 2,
        },
      },
    });
    console.log('Integration created: icmp (enabled)');
  } else {
    console.log('Integration already exists: icmp');
  }
}

async function main() {
  await seedRoles();
  await seedIntegrations();

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Admin user created: ${ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
