import dotenv from 'dotenv';

dotenv.config();

const KNOWN_WEAK_SECRETS = [
  'default_jwt_secret',
  'default_refresh_secret',
  'default_jwt_secret_livestudio_2024',
  'default_jwt_refresh_secret_livestudio_2024',
  'livestudio-jwt-secret-key-2026',
  '0123456789abcdef0123456789abcdef',
];

function isWeakSecret(value: string | undefined, minLength: number): boolean {
  if (!value) return true;
  const v = value.trim();
  if (v.length < minLength) return true;
  if (/CHANGE_ME/i.test(v)) return true;
  return KNOWN_WEAK_SECRETS.includes(v);
}

const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
const isProduction = nodeEnv === 'production';

const jwtSecret = (process.env.JWT_SECRET || '').trim();
const encryptionKey = (process.env.ENCRYPTION_KEY || '').trim();

const problems: string[] = [];
if (isWeakSecret(jwtSecret, 32)) {
  problems.push('JWT_SECRET must be set to a random string of at least 32 characters (e.g. `openssl rand -hex 32`).');
}
if (isWeakSecret(encryptionKey, 32)) {
  problems.push('ENCRYPTION_KEY must be set to a random 64-char hex string (e.g. `openssl rand -hex 32`).');
}

if (problems.length > 0) {
  const msg = `[Config] Insecure configuration:\n  - ${problems.join('\n  - ')}`;
  if (isProduction) {
    console.error(`${msg}\nRefusing to start in production. Set these variables in the Portainer stack environment.`);
    process.exit(1);
  } else {
    console.warn(`${msg}\n(Allowed only because NODE_ENV is not production.)`);
  }
}

function parseOrigins(): string[] {
  const raw = [process.env.CORS_ORIGIN, process.env.APP_URL]
    .filter(Boolean)
    .join(',');
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export const config = {
  NODE_ENV: nodeEnv,
  isProduction,
  // Dev-only fallback so local `npm run dev` works without an .env; production exits above.
  JWT_SECRET: jwtSecret || 'dev-only-insecure-jwt-secret-change-me-please-000000',
  JWT_EXPIRY: process.env.JWT_EXPIRY && process.env.JWT_EXPIRY !== '15m' ? process.env.JWT_EXPIRY : '7d',
  CORS_ORIGINS: parseOrigins(),
  ALLOW_REGISTRATION: (process.env.ALLOW_REGISTRATION ?? 'true').toLowerCase() !== 'false',
};

export function sessionTtlMs(): number {
  const m = String(config.JWT_EXPIRY).match(/^(\d+)\s*([smhd])?$/i);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || 's').toLowerCase();
  const mult = unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : unit === 'm' ? 60000 : 1000;
  return n * mult;
}
