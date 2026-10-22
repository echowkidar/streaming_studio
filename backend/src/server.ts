import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { config } from './config';
import { authenticate, requireAuth, requireSuperAdmin } from './middleware/auth';
import { HttpError } from './lib/access';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import studioRoutes from './routes/studio.routes';
import broadcastRoutes from './routes/broadcast.routes';
import destinationRoutes from './routes/destination.routes';
import recordingRoutes from './routes/recording.routes';
import mediaRoutes from './routes/media.routes';
import brandRoutes from './routes/brand.routes';
import adminRoutes from './routes/admin.routes';
import livekitRoutes from './routes/livekit.routes';
import webinarRoutes from './routes/webinar.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Behind cloudflared -> nginx: trust the private-network proxies so req.ip is the real client.
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'healthy', service: 'livestudio-api', timestamp: new Date().toISOString() } });
});

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
    frameguard: false,
    contentSecurityPolicy: false,
  })
);

// Browsers talk to the API same-origin through nginx; only explicitly configured origins get CORS.
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const clean = origin.replace(/\/+$/, '');
      cb(null, config.CORS_ORIGINS.includes(clean));
    },
    credentials: true,
  })
);
app.use(cookieParser());
// Studio settings (scenes, layouts) can be a few MB.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Resolve req.user from the Bearer token for every request.
app.use(authenticate);

// Public (or self-guarding) route groups
app.use('/api/auth', authRoutes); // login/register public, the rest guarded inside
app.use('/api/livekit', livekitRoutes); // guest token + invite status are public, host actions guarded inside
app.use('/api/media', mediaRoutes); // file/youtube streams public (used as <video src>), management guarded inside
app.use('/api/webinars', webinarRoutes); // public viewer registration/chat, management guarded inside

// Fully authenticated route groups
app.use('/api/workspaces', requireAuth, workspaceRoutes);
app.use('/api/studios', requireAuth, studioRoutes);
app.use('/api/broadcasts', requireAuth, broadcastRoutes);
app.use('/api/destinations', requireAuth, destinationRoutes);
app.use('/api/recordings', requireAuth, recordingRoutes);
app.use('/api/brand', requireAuth, brandRoutes);
app.use('/api/uploads', requireAuth, uploadRoutes);
app.use('/api/admin', requireSuperAdmin, adminRoutes);

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }
  if (err?.name === 'ZodError') {
    res.status(400).json({ success: false, error: err.errors?.[0]?.message || 'Validation failed' });
    return;
  }
  if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ success: false, error: 'Upload too large' });
    return;
  }
  console.error('[API Error]:', err?.stack || err?.message || err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

const PORT = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LiveStudio Express API listening on 0.0.0.0:${PORT}`);
  // Start background services (prerecorded scheduler restores pending jobs on boot)
  import('./services/prerecorded-streamer.service')
    .then(({ PrerecordedStreamerService }) => PrerecordedStreamerService.getInstance())
    .catch((e) => console.warn('[Boot] Prerecorded scheduler failed to start:', e));
});
