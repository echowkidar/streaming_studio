import { Response, NextFunction } from 'express';
import { AuthRequest, Role, ApiResponse } from '../types';

export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole([Role.ADMIN]);
export const requireCreator = requireRole([Role.CREATOR, Role.ADMIN]);
