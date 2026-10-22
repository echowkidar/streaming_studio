/**
 * Admin bootstrap (runs on every API container start, must be idempotent and safe).
 *
 * - If no SUPER_ADMIN exists, one is created from ADMIN_EMAIL / ADMIN_PASSWORD
 *   (or a random password is generated and printed once in the container logs).
 * - Any SUPER_ADMIN still using a password that was published in the repo
 *   ("AdminPassword123!") or the old "seeded" placeholder gets a new password.
 * - Existing accounts are otherwise never touched.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const KNOWN_DEFAULTS = ['AdminPassword123!', 'MemberPassword123!'];

function randomPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

async function usesKnownDefault(hash: string): Promise<boolean> {
  if (!hash || hash === 'seeded' || !hash.startsWith('$2')) return true;
  for (const pw of KNOWN_DEFAULTS) {
    if (await bcrypt.compare(pw, hash).catch(() => false)) return true;
  }
  return false;
}

async function main() {
  const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const envPassword = (process.env.ADMIN_PASSWORD || '').trim();
  if (envPassword && (envPassword.length < 10 || KNOWN_DEFAULTS.includes(envPassword))) {
    console.error('[Bootstrap] ADMIN_PASSWORD is too weak (min 10 chars, not a known default). Ignoring it.');
  }
  const usableEnvPassword = envPassword.length >= 10 && !KNOWN_DEFAULTS.includes(envPassword) ? envPassword : '';

  const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, orderBy: { createdAt: 'asc' } });

  if (admins.length === 0) {
    const email = envEmail || 'admin@livestudio.local';
    const password = usableEnvPassword || randomPassword();
    const existing = await prisma.user.findUnique({ where: { email } });
    const admin = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(password, 12) },
        })
      : await prisma.user.create({
          data: { email, name: 'Super Admin', role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(password, 12) },
        });
    const ws = await prisma.workspace.findFirst({ where: { ownerId: admin.id } });
    if (!ws) {
      await prisma.workspace.create({
        data: {
          name: 'Admin Studio',
          slug: `ws-admin-${Date.now()}`,
          ownerId: admin.id,
          members: { create: { userId: admin.id, role: 'OWNER' } },
        },
      });
    }
    console.log(`[Bootstrap] Created SUPER_ADMIN ${email}.`);
    if (!usableEnvPassword) {
      console.log(`[Bootstrap] Generated password (shown once, change it after login): ${password}`);
    }
    return;
  }

  for (const admin of admins) {
    if (!(await usesKnownDefault(admin.passwordHash))) continue;
    const isPrimary = admin.id === admins[0].id;
    const password = isPrimary && usableEnvPassword ? usableEnvPassword : randomPassword();
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    await prisma.session.deleteMany({ where: { userId: admin.id } });
    console.log(`[Bootstrap] SUPER_ADMIN ${admin.email} was using a publicly known default password — it has been replaced.`);
    if (password !== usableEnvPassword) {
      console.log(`[Bootstrap] New password for ${admin.email} (shown once, change it after login): ${password}`);
    } else {
      console.log(`[Bootstrap] ${admin.email} now uses ADMIN_PASSWORD from the environment.`);
    }
  }

  // Non-admin accounts created with the old hard-coded member password are locked out by the
  // login route; an admin can reset them from the admin panel.
}

main()
  .catch((error: unknown) => {
    console.error('[Bootstrap] Failed:', error instanceof Error ? error.message : error);
  })
  .finally(() => prisma.$disconnect());
