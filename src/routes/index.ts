import Router from 'koa-router';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import pageRoutes from './page.routes';

const router = new Router();

// Health check
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
router.use(authRoutes.routes());
router.use(projectRoutes.routes());
router.use(pageRoutes.routes());

export default router;
