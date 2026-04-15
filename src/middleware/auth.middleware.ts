import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError } from '../utils/errors';
import { CacheService } from '../services/cache.service';

const cacheService = new CacheService();

export const authMiddleware = async (ctx: Context, next: Next): Promise<void> => {
  try {
    const token = ctx.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Check session in Redis
    const session = await cacheService.getSession(decoded.userId);
    if (!session || session.token !== token) {
      throw new AuthenticationError('Invalid or expired session');
    }

    // Attach user to context
    ctx.state.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    await next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Invalid or expired token');
    }
    throw error;
  }
};

// Optional auth middleware (doesn't throw if no token)
export const optionalAuthMiddleware = async (ctx: Context, next: Next): Promise<void> => {
  try {
    const token = ctx.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const session = await cacheService.getSession(decoded.userId);

      if (session && session.token === token) {
        ctx.state.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  await next();
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]) => {
  return async (ctx: Context, next: Next): Promise<void> => {
    if (!ctx.state.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(ctx.state.user.role)) {
      throw new AuthenticationError('Insufficient permissions');
    }

    await next();
  };
};
