import { Request } from 'express';
import { z } from 'zod';

export enum Role {
  USER = 'USER',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
}

export interface JwtPayload {
  userId: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string | z.ZodError | unknown;
}
