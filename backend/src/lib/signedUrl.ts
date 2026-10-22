import crypto from 'crypto';
import { config } from '../config';

/**
 * Short-lived signed links for resources that are opened directly by the browser
 * (<video src>, download links) where an Authorization header cannot be sent.
 */
function sign(resource: string, exp: number): string {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(`${resource}:${exp}`).digest('base64url');
}

export function createSignedQuery(resource: string, ttlSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `exp=${exp}&sig=${sign(resource, exp)}`;
}

export function verifySignedQuery(resource: string, query: Record<string, unknown>): boolean {
  const exp = parseInt(String(query.exp || ''), 10);
  const sig = String(query.sig || '');
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(resource, exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
