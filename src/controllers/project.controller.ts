import { Context } from 'koa';
import { Project } from '../models/Project';
import { ResponseHelper } from '../utils/response';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { CreateProjectRequest, UpdateProjectRequest, AddMemberRequest } from '../types';
import { CacheService } from '../services/cache.service';

const cacheService = new CacheService();

export class ProjectController {
  async create(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;
    const { name, description, isPublic } = ctx.request.body as CreateProjectRequest;

    const project = await Project.create({
      name,
      description,
      owner: userId,
      members: [{ userId, role: 'owner' }],
      isPublic: isPublic || false,
    });

    // Invalidate user projects cache
    await cacheService.deleteUserProjects(userId);

    ResponseHelper.created(ctx, project, 'Project created successfully');
  }

  async list(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;

    // Try cache first
    const cached = await cacheService.getUserProjects(userId);
    if (cached) {
      ResponseHelper.success(ctx, cached);
      return;
    }

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.userId': userId },
        { isPublic: true },
      ],
    }).sort({ updatedAt: -1 });

    // Cache the result
    await cacheService.setUserProjects(userId, projects);

    ResponseHelper.success(ctx, projects);
  }

  async getById(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    // Try cache first
    const cached = await cacheService.getProject(id);
    if (cached) {
      ResponseHelper.success(ctx, cached);
      return;
    }

    const project = await Project.findById(id).populate('owner', 'username email avatar');

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access
    const hasAccess =
      project.owner._id.toString() === userId ||
      project.members.some(m => m.userId.toString() === userId) ||
      project.isPublic;

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    // Cache the result
    await cacheService.setProject(id, project);

    ResponseHelper.success(ctx, project);
  }

  async update(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const updates = ctx.request.body as UpdateProjectRequest;

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check if user is owner or editor
    const member = project.members.find(m => m.userId.toString() === userId);
    const isOwner = project.owner.toString() === userId;
    const isEditor = member?.role === 'editor';

    if (!isOwner && !isEditor) {
      throw new AuthorizationError('Only owner or editor can update project');
    }

    // Update fields
    if (updates.name) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.isPublic !== undefined && isOwner) project.isPublic = updates.isPublic;

    await project.save();

    // Invalidate caches
    await cacheService.invalidateProjectCache(id, userId);

    ResponseHelper.success(ctx, project, 'Project updated successfully');
  }

  async delete(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Only owner can delete
    if (project.owner.toString() !== userId) {
      throw new AuthorizationError('Only owner can delete project');
    }

    await Project.findByIdAndDelete(id);

    // Invalidate caches
    await cacheService.invalidateProjectCache(id, userId);

    ResponseHelper.success(ctx, null, 'Project deleted successfully');
  }

  async addMember(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const { userId: newUserId, role } = ctx.request.body as AddMemberRequest;

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Only owner can add members
    if (project.owner.toString() !== userId) {
      throw new AuthorizationError('Only owner can add members');
    }

    // Check if member already exists
    const existingMember = project.members.find(m => m.userId.toString() === newUserId);
    if (existingMember) {
      throw new Error('User is already a member');
    }

    project.members.push({ userId: newUserId as any, role });
    await project.save();

    // Invalidate caches
    await cacheService.invalidateProjectCache(id, userId);
    await cacheService.deleteUserProjects(newUserId);

    ResponseHelper.success(ctx, project, 'Member added successfully');
  }

  async removeMember(ctx: Context): Promise<void> {
    const { id, userId: memberUserId } = ctx.params;
    const userId = ctx.state.user.userId;

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Only owner can remove members
    if (project.owner.toString() !== userId) {
      throw new AuthorizationError('Only owner can remove members');
    }

    project.members = project.members.filter(m => m.userId.toString() !== memberUserId);
    await project.save();

    // Invalidate caches
    await cacheService.invalidateProjectCache(id, userId);
    await cacheService.deleteUserProjects(memberUserId);

    ResponseHelper.success(ctx, project, 'Member removed successfully');
  }
}
