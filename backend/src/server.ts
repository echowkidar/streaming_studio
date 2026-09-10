import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import studioRoutes from './routes/studio.routes';
import broadcastRoutes from './routes/broadcast.routes';
import destinationRoutes from './routes/destination.routes';
import recordingRoutes from './routes/recording.routes';
import mediaRoutes from './routes/media.routes';
import participantRoutes from './routes/participant.routes';
import brandRoutes from './routes/brand.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck endpoints (used by Docker and Load Balancers)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'healthy', service: 'livestudio-api', timestamp: new Date().toISOString() } });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'healthy', service: 'livestudio-api', timestamp: new Date().toISOString() } });
});

// Mount All API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]:', err.stack || err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Port configuration: accepts PORT or API_PORT, defaults to 4000
const rawPort = process.env.PORT || process.env.API_PORT || '4000';
const PORT = parseInt(rawPort, 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LiveStudio Express API listening on 0.0.0.0:${PORT}`);
});
