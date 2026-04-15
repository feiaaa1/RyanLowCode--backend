import Router from 'koa-router';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/auth' });
const authController = new AuthController();

// Public routes
router.post('/register', (ctx) => authController.register(ctx));
router.post('/login', (ctx) => authController.login(ctx));
router.post('/refresh', (ctx) => authController.refreshToken(ctx));

// Protected routes
router.post('/logout', authMiddleware, (ctx) => authController.logout(ctx));
router.get('/me', authMiddleware, (ctx) => authController.getCurrentUser(ctx));

export default router;
