import Router from 'koa-router';
import { PageController } from '../controllers/page.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/pages' });
const pageController = new PageController();

// All routes require authentication
router.use(authMiddleware);

router.post('/', (ctx) => pageController.create(ctx));
router.get('/', (ctx) => pageController.list(ctx));
router.get('/:id', (ctx) => pageController.getById(ctx));
router.put('/:id', (ctx) => pageController.update(ctx));
router.delete('/:id', (ctx) => pageController.delete(ctx));
router.post('/:id/publish', (ctx) => pageController.publish(ctx));
router.get('/:id/history', (ctx) => pageController.getHistory(ctx));
router.post('/:id/restore/:version', (ctx) => pageController.restoreVersion(ctx));
router.post('/:id/duplicate', (ctx) => pageController.duplicate(ctx));

export default router;
