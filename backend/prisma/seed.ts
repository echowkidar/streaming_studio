import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);

    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@livestudio.io' },
      update: {},
      create: {
        email: 'admin@livestudio.io',
        passwordHash,
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
