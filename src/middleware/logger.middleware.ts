import { Context, Next } from 'koa';
import { logger } from '../utils/logger';

export const loggerMiddleware = async (ctx: Context, next: Next): Promise<void> => {
  const start = Date.now();

  await next();

  const ms = Date.now() - start;

  logger.info('HTTP Request', {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${ms}ms`,
    ip: ctx.ip,
    userAgent: ctx.headers['user-agent'],
  });
};
