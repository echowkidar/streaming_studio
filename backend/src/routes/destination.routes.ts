import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router({ mergeParams: true });

const DestinationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.enum(['youtube', 'twitch', 'facebook', 'custom_rtmp']),
  serverUrl: z.string().url('Invalid RTMP server URL'),
  streamKey: z.string().min(1, 'Stream key is required'),
});

const UpdateDestinationSchema = DestinationSchema.partial();

// Utility for encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encryptStreamKey(text: string): string {
  if (Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY length');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = DestinationSchema.parse(req.body);
    
    // Encrypt the stream key before storing
    const encryptedStreamKey = encryptStreamKey(data.streamKey);
    const destinationData = {
      ...data,
      streamKey: encryptedStreamKey,
    };

    // TODO: Store destinationData in DB
    res.status(201).json({ success: true, data: { id: 'dest_1', ...destinationData, streamKey: '***' } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Fetch destinations, do NOT return unencrypted stream keys in lists
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/:destinationId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: { id: req.params.destinationId, name: 'Main YouTube', platform: 'youtube', serverUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: '***' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.put('/:destinationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateDestinationSchema.parse(req.body);
    
    let updateData = { ...data };
    if (data.streamKey) {
      updateData.streamKey = encryptStreamKey(data.streamKey);
    }

    res.status(200).json({ success: true, data: { id: req.params.destinationId, ...updateData, streamKey: updateData.streamKey ? '***' : undefined } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.delete('/:destinationId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
