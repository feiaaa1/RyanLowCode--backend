import { Context } from 'koa';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { ResponseHelper } from '../utils/response';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { CreateProjectRequest, UpdateProjectRequest, AddMemberRequest } from '../types';
import { CacheService } from '../services/cache.service';

const cacheService = new CacheService();

const toObjectIdString = (value: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId } | string): string => {
  if (typeof value === 'string') return value;
  if ('_id' in value && value._id) return value._id.toString();
  return value.toString();
};

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

    await cacheService.deleteUserProjects(userId);

    ResponseHelper.created(ctx, project, 'Project created successfully');
  }

  async list(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;

    const cached = await cacheService.getUserProjects(userId);
    if (cached) {
      ResponseHelper.success(ctx, cached);
      return;
    }

    const projects = await Project.find({
      $or: [{ owner: userId }, { 'members.userId': userId }, { isPublic: true }],
    })
      .populate('owner', 'username email avatar')
      .populate('members.userId', 'username email avatar')
      .sort({ updatedAt: -1 });

    await cacheService.setUserProjects(userId, projects);

    ResponseHelper.success(ctx, projects);
  }

  async listAll(ctx: Context): Promise<void> {
    if (ctx.state.user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    const projects = await Project.find({})
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role')
      .sort({ updatedAt: -1 });

    ResponseHelper.success(ctx, projects);
  }

  async getMembers(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';

    const project = await Project.findById(id)
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role');

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const ownerId = toObjectIdString(project.owner as any);
    const hasAccess =
      isAdmin ||
      ownerId === userId ||
      project.members.some((member) => toObjectIdString(member.userId as any) === userId);

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    ResponseHelper.success(ctx, {
      owner: project.owner,
      members: project.members,
    });
  }

  async updateMember(ctx: Context): Promise<void> {
    const { id, userId: memberUserId } = ctx.params;
    const currentUserId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';
    const { role } = ctx.request.body as { role: 'editor' | 'viewer' };

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const isOwner = project.owner.toString() === currentUserId;
    if (!isOwner && !isAdmin) {
      throw new AuthorizationError('Only owner or admin can update members');
    }

    const targetMember = project.members.find((member) => member.userId.toString() === memberUserId);
    if (!targetMember) {
      throw new NotFoundError('Member not found');
    }

    targetMember.role = role;
    await project.save();

    await cacheService.invalidateProjectCache(id, currentUserId);
    await cacheService.deleteUserProjects(memberUserId);

    const updatedProject = await Project.findById(id)
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role');

    ResponseHelper.success(ctx, updatedProject, 'Member role updated successfully');
  }

  async listUsers(ctx: Context): Promise<void> {
    if (ctx.state.user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    const users = await User.find({}).select('_id username email avatar role createdAt').sort({ createdAt: -1 });
    ResponseHelper.success(ctx, users);
  }

  async getById(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';

    const cached = await cacheService.getProject(id);
    if (cached && !isAdmin) {
      ResponseHelper.success(ctx, cached);
      return;
    }

    const project = await Project.findById(id)
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role');

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const ownerId = toObjectIdString(project.owner as any);
    const hasAccess =
      isAdmin ||
      ownerId === userId ||
      project.members.some((m) => toObjectIdString(m.userId as any) === userId) ||
      project.isPublic;

    if (!hasAccess) {
      throw new AuthorizationError('Access denied');
    }

    await cacheService.setProject(id, project);

    ResponseHelper.success(ctx, project);
  }

  async update(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';
    const updates = ctx.request.body as UpdateProjectRequest;

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const member = project.members.find((m) => m.userId.toString() === userId);
    const isOwner = project.owner.toString() === userId;
    const isEditor = member?.role === 'editor';

    if (!isOwner && !isEditor && !isAdmin) {
      throw new AuthorizationError('Only owner, editor or admin can update project');
    }

    if (updates.name) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.isPublic !== undefined && (isOwner || isAdmin)) project.isPublic = updates.isPublic;

    await project.save();

    await cacheService.invalidateProjectCache(id, userId);

    const updatedProject = await Project.findById(id)
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role');

    ResponseHelper.success(ctx, updatedProject, 'Project updated successfully');
  }

  async delete(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId && !isAdmin) {
      throw new AuthorizationError('Only owner or admin can delete project');
    }

    await Project.findByIdAndDelete(id);

    await cacheService.invalidateProjectCache(id, userId);

    ResponseHelper.success(ctx, null, 'Project deleted successfully');
  }

  async addMember(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    const userId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';
    const { userId: newUserId, role } = ctx.request.body as AddMemberRequest;

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId && !isAdmin) {
      throw new AuthorizationError('Only owner or admin can add members');
    }

    const existingMember = project.members.find((m) => m.userId.toString() === newUserId);
    if (existingMember) {
      throw new Error('User is already a member');
    }

    project.members.push({ userId: newUserId as any, role });
    await project.save();

    await cacheService.invalidateProjectCache(id, userId);
    await cacheService.deleteUserProjects(newUserId);

    const updatedProject = await Project.findById(id)
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role');

    ResponseHelper.success(ctx, updatedProject, 'Member added successfully');
  }

  async removeMember(ctx: Context): Promise<void> {
    const { id, userId: memberUserId } = ctx.params;
    const userId = ctx.state.user.userId;
    const isAdmin = ctx.state.user.role === 'admin';

    const project = await Project.findById(id);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId && !isAdmin) {
      throw new AuthorizationError('Only owner or admin can remove members');
    }

    project.members = project.members.filter((m) => m.userId.toString() !== memberUserId);
    await project.save();

    await cacheService.invalidateProjectCache(id, userId);
    await cacheService.deleteUserProjects(memberUserId);

    const updatedProject = await Project.findById(id)
      .populate('owner', 'username email avatar role')
      .populate('members.userId', 'username email avatar role');

    ResponseHelper.success(ctx, updatedProject, 'Member removed successfully');
  }
}
