import fs from 'fs';
import { Request, Response } from 'express';

/** Stream a local file with correct HTTP Range support (including suffix ranges like bytes=-500). */
export async function streamLocalFile(
  req: Request,
  res: Response,
  fullPath: string,
  contentType: string,
  extraHeaders: Record<string, string> = {}
): Promise<void> {
  const stat = await fs.promises.stat(fullPath);
  const size = stat.size;
  const baseHeaders: Record<string, string | number> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  };

  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
    fs.createReadStream(fullPath).pipe(res);
    return;
  }

  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start: number;
  let end: number;
  if (!m || (m[1] === '' && m[2] === '')) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }
  if (m[1] === '') {
    const suffix = parseInt(m[2], 10);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(m[1], 10);
    end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  }
  if (start >= size || start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    ...baseHeaders,
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': end - start + 1,
  });
  fs.createReadStream(fullPath, { start, end }).pipe(res);
}
