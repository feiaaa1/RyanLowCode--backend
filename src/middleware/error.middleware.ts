import { Context, Next } from 'koa';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ResponseHelper } from '../utils/response';

export const errorMiddleware = async (ctx: Context, next: Next): Promise<void> => {
  try {
    await next();
  } catch (error: any) {
    logger.error('Error caught by middleware:', {
      message: error.message,
      stack: error.stack,
      url: ctx.url,
      method: ctx.method,
    });

    if (error instanceof AppError) {
      ResponseHelper.error(ctx, error.message, error.statusCode);
    } else if (error.name === 'ValidationError') {
      ResponseHelper.error(ctx, error.message, 400);
    } else if (error.name === 'CastError') {
      ResponseHelper.error(ctx, 'Invalid ID format', 400);
    } else if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      ResponseHelper.error(ctx, `${field} already exists`, 409);
    } else {
      ResponseHelper.serverError(ctx, 'Internal server error', error);
    }
  }
};
