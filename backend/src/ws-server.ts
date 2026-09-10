import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { z } from 'zod';

const rawPort = process.env.PORT || process.env.WS_PORT || '4001';
const PORT = parseInt(rawPort, 10);

// HTTP Server with health check handler
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/ws/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, service: 'livestudio-websocket', status: 'healthy' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

const messageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection established');

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message);
      const validated = messageSchema.parse(parsed);
      
      console.log('Received WebSocket message type:', validated.type);
      ws.send(JSON.stringify({ success: true, data: { received: true, type: validated.type } }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid message format';
      ws.send(JSON.stringify({ success: false, error: errorMessage }));
    }
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LiveStudio WebSocket server listening on 0.0.0.0:${PORT}`);
});
