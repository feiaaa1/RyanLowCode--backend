import Router from 'koa-router';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/projects' });
const projectController = new ProjectController();

router.use(authMiddleware);

router.get('/all', (ctx) => projectController.listAll(ctx));
router.get('/users/all', (ctx) => projectController.listUsers(ctx));
router.get('/:id/members', (ctx) => projectController.getMembers(ctx));
router.put('/:id/members/:userId', (ctx) => projectController.updateMember(ctx));
router.post('/', (ctx) => projectController.create(ctx));
router.get('/', (ctx) => projectController.list(ctx));
router.get('/:id', (ctx) => projectController.getById(ctx));
router.put('/:id', (ctx) => projectController.update(ctx));
router.delete('/:id', (ctx) => projectController.delete(ctx));
router.post('/:id/members', (ctx) => projectController.addMember(ctx));
router.delete('/:id/members/:userId', (ctx) => projectController.removeMember(ctx));

export default router;
