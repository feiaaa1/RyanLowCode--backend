import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { redisClient } from './config/redis';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import router from './routes';
import { logger } from './utils/logger';

const app = new Koa();

// Middleware
app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(bodyParser());

// Routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();

    // Check Redis connection
    const redisHealthy = await redisClient.healthCheck();
    if (!redisHealthy) {
      logger.warn('Redis connection failed, but server will continue');
    }

    // Start listening
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`CORS origin: ${config.cors.origin}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
