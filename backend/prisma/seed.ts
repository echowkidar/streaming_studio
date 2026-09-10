import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@livestudio.local' },
      update: {},
      create: {
        email: 'admin@livestudio.local',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });

    const defaultWorkspace = await prisma.workspace.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        name: 'Default Workspace',
        slug: 'default',
        ownerId: superAdmin.id,
      },
    });

    console.log({ success: true, data: { superAdmin, defaultWorkspace } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during seeding';
    console.error({ success: false, error: errorMessage });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
