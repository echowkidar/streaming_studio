import { Server as SocketIOServer, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { Server as HttpServer } from 'http';
import { z } from 'zod';

export type ServiceResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

interface JwtPayload {
  userId: string;
}

export const JoinRoomSchema = z.object({
  roomId: z.string(),
});

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET ?? 'default_jwt_secret';
  }

  public initialize(server: HttpServer): ServiceResponse<void> {
    try {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: process.env.CORS_ORIGIN ?? '*',
          methods: ['GET', 'POST'],
        },
      });

      this.setupMiddleware();
      this.setupEventHandlers();

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to initialize WebSocket server' };
    }
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token is missing'));
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
        socket.data.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Invalid or expired authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as string;

      socket.on('join_room', (payload: unknown) => {
        try {
          const { roomId } = JoinRoomSchema.parse(payload);
          socket.join(roomId);
          this.io?.to(roomId).emit('user_joined', { userId, roomId });
        } catch (error) {
          socket.emit('error', { message: 'Invalid join_room payload' });
        }
      });

      socket.on('leave_room', (payload: unknown) => {
        try {
          const { roomId } = JoinRoomSchema.parse(payload);
          socket.leave(roomId);
          this.io?.to(roomId).emit('user_left', { userId, roomId });
        } catch (error) {
          socket.emit('error', { message: 'Invalid leave_room payload' });
        }
      });

      socket.on('disconnect', () => {
        // Handle disconnect cleanup if necessary
      });
    });
  }

  public broadcastToRoom(roomId: string, event: string, data: unknown): ServiceResponse<void> {
    try {
      if (!this.io) {
        return { success: false, error: 'WebSocket server not initialized' };
      }
      this.io.to(roomId).emit(event, data);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to broadcast message' };
    }
  }
}
