import Router from 'koa-router';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import pageRoutes from './page.routes';
import runtimeRoutes from './runtime.routes';

const router = new Router();

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

router.use(authRoutes.routes());
router.use(projectRoutes.routes());
router.use(pageRoutes.routes());
router.use(runtimeRoutes.routes());

export default router;
