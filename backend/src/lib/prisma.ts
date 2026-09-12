import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables if not already loaded
dotenv.config();

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Resolve DATABASE_URL safely.
 * Prevents Prisma error: "The environment variable DATABASE_URL resolved to an empty string"
 */
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  const user = process.env.POSTGRES_USER || 'livestudio';
  const password = process.env.POSTGRES_PASSWORD || 'livestudio';
  const host = process.env.POSTGRES_HOST || 'postgres';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'livestudio';

  const generatedUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?schema=public`;
  console.warn(`[Prisma] Warning: DATABASE_URL was not set or empty. Generated fallback connection: postgresql://${user}:****@${host}:${port}/${db}`);
  return generatedUrl;
}

const activeDbUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = activeDbUrl;

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

