import fs from 'fs';
import path from 'path';

/** Root for all on-disk uploads. Mounted as a Docker volume so files survive redeploys. */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export function uploadsSubdir(name: string): string {
  const dir = path.join(UPLOADS_ROOT, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
