import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { z } from 'zod';

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3001;

const server = http.createServer();
const wss = new WebSocketServer({ server });

const messageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message);
      const validated = messageSchema.parse(parsed);
      
      console.log('Received valid message:', validated.type);
      
      ws.send(JSON.stringify({ success: true, data: { received: true } }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid message format';
      ws.send(JSON.stringify({ success: false, error: errorMessage }));
    }
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error.message);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});
