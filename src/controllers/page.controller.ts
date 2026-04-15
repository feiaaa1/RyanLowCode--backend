import { Context } from 'koa';
import { Page } from '../models/Page';
import { Project } from '../models/Project';
import { History } from '../models/History';
import { ResponseHelper } from '../utils/response';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { CreatePageRequest, UpdatePageRequest } from '../types';
import { CacheService } from '../services/cache.service';

const cacheService = new CacheService();

export class PageController {
  async create(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;
    const { name, projectId, formNodeTree } = ctx.request.body as CreatePageRequest;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some(m => m.userId.toString() === userId && m.role !== 'viewer');

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    const page = await Page.create({
      name,
      projectId,
      formNodeTree,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create initial history
    await History.create({
      pageId: page._id,
      version: 1,
      formNodeTree,
      changedBy: userId,
      changeDescription: 'Initial version',
    });

    ResponseHelper.created(ctx, page, 'Page created successfully');
  }

  async list(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;
    const { projectId } = ctx.query;

    if (!projectId) {
      throw new Error('projectId is required');
    }

    // Verify project access
    const project = await Project.findById(projectId as string);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some(m => m.userId.toString() === userId) ||
      project.isPublic;

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    const pages = await Page.find({ projectId })
      .select('-formNodeTree')
      .sort({ updatedAt: -1 });

    ResponseHelper.success(ctx, pages);
  }

  async getById(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    // Try cache first
    const cached = await cacheService.getPage(id);
    if (cached) {
      ResponseHelper.success(ctx, cached);
      return;
    }

    const page = await Page.findById(id).populate('projectId', 'name owner members isPublic');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access through project
    const project = page.projectId as any;
    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some((m: any) => m.userId.toString() === userId) ||
      project.isPublic;

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    // Cache the result
    await cacheService.setPage(id, page);

    ResponseHelper.success(ctx, page);
  }

  async update(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const updates = ctx.request.body as UpdatePageRequest;

    const page = await Page.findById(id).populate('projectId');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access
    const project = page.projectId as any;
    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some((m: any) => m.userId.toString() === userId && m.role !== 'viewer');

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    // Save to history if formNodeTree changed
    if (updates.formNodeTree) {
      page.version += 1;
      await History.create({
        pageId: page._id,
        version: page.version,
        formNodeTree: updates.formNodeTree,
        changedBy: userId,
      });
    }

    // Update fields
    if (updates.name) page.name = updates.name;
    if (updates.formNodeTree) page.formNodeTree = updates.formNodeTree;
    if (updates.status) page.status = updates.status;
    page.updatedBy = userId as any;

    await page.save();

    // Invalidate caches
    await cacheService.invalidatePageCache(id, project._id.toString());

    ResponseHelper.success(ctx, page, 'Page updated successfully');
  }

  async delete(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    const page = await Page.findById(id).populate('projectId');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access
    const project = page.projectId as any;
    const isOwner = project.owner.toString() === userId;
    const isEditor = project.members.some(
      (m: any) => m.userId.toString() === userId && m.role === 'editor'
    );

    if (!isOwner && !isEditor) {
      throw new AuthorizationError('Only owner or editor can delete page');
    }

    await Page.findByIdAndDelete(id);
    await History.deleteMany({ pageId: id });

    // Invalidate caches
    await cacheService.invalidatePageCache(id, project._id.toString());

    ResponseHelper.success(ctx, null, 'Page deleted successfully');
  }

  async publish(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    const page = await Page.findById(id).populate('projectId');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access
    const project = page.projectId as any;
    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some((m: any) => m.userId.toString() === userId && m.role !== 'viewer');

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    page.status = 'published';
    page.updatedBy = userId as any;
    await page.save();

    // Invalidate caches
    await cacheService.invalidatePageCache(id, project._id.toString());

    ResponseHelper.success(ctx, page, 'Page published successfully');
  }

  async getHistory(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    const page = await Page.findById(id).populate('projectId');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access
    const project = page.projectId as any;
    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some((m: any) => m.userId.toString() === userId) ||
      project.isPublic;

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    const history = await History.find({ pageId: id })
      .populate('changedBy', 'username email')
      .sort({ version: -1 });

    ResponseHelper.success(ctx, history);
  }

  async restoreVersion(ctx: Context): Promise<void> {
    const { id, version } = ctx.params;
    const userId = ctx.state.user.userId;

    const page = await Page.findById(id).populate('projectId');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access
    const project = page.projectId as any;
    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some((m: any) => m.userId.toString() === userId && m.role !== 'viewer');

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    const historyRecord = await History.findOne({ pageId: id, version: parseInt(version) });

    if (!historyRecord) {
      throw new NotFoundError('Version not found');
    }

    // Create new version with restored content
    page.version += 1;
    page.formNodeTree = historyRecord.formNodeTree;
    page.updatedBy = userId as any;
    await page.save();

    // Save to history
    await History.create({
      pageId: page._id,
      version: page.version,
      formNodeTree: historyRecord.formNodeTree,
      changedBy: userId,
      changeDescription: `Restored from version ${version}`,
    });

    // Invalidate caches
    await cacheService.invalidatePageCache(id, project._id.toString());

    ResponseHelper.success(ctx, page, 'Version restored successfully');
  }

  async duplicate(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    const page = await Page.findById(id).populate('projectId');

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check access
    const project = page.projectId as any;
    const hasAccess =
      project.owner.toString() === userId ||
      project.members.some((m: any) => m.userId.toString() === userId && m.role !== 'viewer');

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    const newPage = await Page.create({
      name: `${page.name} (Copy)`,
      projectId: page.projectId,
      formNodeTree: page.formNodeTree,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create initial history for duplicated page
    await History.create({
      pageId: newPage._id,
      version: 1,
      formNodeTree: newPage.formNodeTree,
      changedBy: userId,
      changeDescription: `Duplicated from ${page.name}`,
    });

    ResponseHelper.created(ctx, newPage, 'Page duplicated successfully');
  }
}
