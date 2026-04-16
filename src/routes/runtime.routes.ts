import Router from 'koa-router';
import { Context } from 'koa';
import { Page } from '../models/Page';
import { Project } from '../models/Project';
import { FormSubmission } from '../models/FormSubmission';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { ResponseHelper } from '../utils/response';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import type { FormNode } from '../types';

const router = new Router({ prefix: '/api/runtime' });

const collectValidationErrors = (nodes: FormNode[] = [], payload: Record<string, any>, errors: string[] = []): string[] => {
  nodes.forEach((node) => {
    const field = node.configs?.props?.item_field ?? node.configs?.props?._field;
    const label = node.configs?.props?.item_label ?? node.configs?.props?._label ?? node.name;
    const validate = node.configs?.validate ?? {};
    const value = field ? payload[field] : undefined;

    if (field) {
      if (validate.required && (value === undefined || value === null || value === '')) {
        errors.push(`${label}为必填项`);
      }

      if (typeof value === 'string' && validate.min !== undefined && validate.min !== '' && value.length < Number(validate.min)) {
        errors.push(`${label}长度不能小于${validate.min}`);
      }

      if (typeof value === 'string' && validate.max !== undefined && validate.max !== '' && value.length > Number(validate.max)) {
        errors.push(`${label}长度不能大于${validate.max}`);
      }
    }

    if (node.childrens?.length) {
      collectValidationErrors(node.childrens, payload, errors);
    }
  });

  return errors;
};

const findRootFormConfig = (nodes: FormNode[] = []): {
  submitMode?: 'internal' | 'proxy';
  submitEndpoint?: string;
  submitMethod?: 'POST' | 'PUT';
  successMessage?: string;
  resetAfterSubmit?: boolean;
  successAction?: 'none' | 'redirect';
  redirectUrl?: string;
} => {
  for (const node of nodes) {
    if (node.type === 'form') {
      return {
        submitMode: node.configs?.props?.submit_mode,
        submitEndpoint: node.configs?.props?.submit_endpoint,
        submitMethod: node.configs?.props?.submit_method,
        successMessage: node.configs?.props?.submit_successMessage,
        resetAfterSubmit: node.configs?.props?.submit_resetAfterSubmit,
        successAction: node.configs?.props?.submit_successAction,
        redirectUrl: node.configs?.props?.submit_redirectUrl,
      };
    }
    if (node.childrens?.length) {
      const nested = findRootFormConfig(node.childrens);
      if (nested.submitMode || nested.submitEndpoint || nested.submitMethod || nested.successMessage || nested.redirectUrl) {
        return nested;
      }
    }
  }
  return {};
};

router.get('/pages/:id', optionalAuthMiddleware, async (ctx: Context) => {
  const { id } = ctx.params;
  const page = await Page.findById(id).populate('projectId', 'name owner members isPublic');

  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const project = page.projectId as any;
  const currentUserId = ctx.state.user?.userId;
  const hasAccess =
    page.status === 'published' ||
    project.isPublic ||
    project.owner.toString() === currentUserId ||
    project.members.some((member: any) => member.userId.toString() === currentUserId);

  if (!hasAccess) {
    throw new AuthorizationError('Access denied');
  }

  ResponseHelper.success(ctx, {
    _id: page._id,
    name: page.name,
    status: page.status,
    version: page.version,
    projectId: page.projectId,
    formNodeTree: page.formNodeTree,
  });
});

router.post('/pages/:id/submit', optionalAuthMiddleware, async (ctx: Context) => {
  const { id } = ctx.params;
  const payload = (ctx.request.body ?? {}) as Record<string, any>;
  const page = await Page.findById(id).populate('projectId', 'name owner members isPublic');

  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const project = page.projectId as any;
  const currentUserId = ctx.state.user?.userId;
  const hasAccess =
    page.status === 'published' ||
    project.isPublic ||
    project.owner.toString() === currentUserId ||
    project.members.some((member: any) => member.userId.toString() === currentUserId);

  if (!hasAccess) {
    throw new AuthorizationError('Access denied');
  }

  const validationErrors = collectValidationErrors(page.formNodeTree, payload);
  if (validationErrors.length) {
    await FormSubmission.create({
      pageId: page._id,
      projectId: project._id,
      payload,
      submitter: currentUserId ? { userId: currentUserId } : undefined,
      status: 'failed',
      message: validationErrors.join('；'),
    });

    ResponseHelper.error(ctx, validationErrors.join('；'), 422);
    return;
  }

  const formConfig = findRootFormConfig(page.formNodeTree);
  let proxyResponse: any = undefined;

  if (formConfig.submitMode === 'proxy' && formConfig.submitEndpoint) {
    try {
      const response = await fetch(formConfig.submitEndpoint, {
        method: formConfig.submitMethod || 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      proxyResponse = text ? JSON.parse(text) : { success: response.ok };

      if (!response.ok) {
        await FormSubmission.create({
          pageId: page._id,
          projectId: project._id,
          payload,
          submitter: currentUserId ? { userId: currentUserId } : undefined,
          status: 'failed',
          message: `转发失败：${response.status}`,
        });

        ResponseHelper.error(ctx, `转发失败：${response.status}`, 502);
        return;
      }
    } catch (error) {
      await FormSubmission.create({
        pageId: page._id,
        projectId: project._id,
        payload,
        submitter: currentUserId ? { userId: currentUserId } : undefined,
        status: 'failed',
        message: error instanceof Error ? error.message : '转发失败',
      });

      ResponseHelper.error(ctx, error instanceof Error ? error.message : '转发失败', 502);
      return;
    }
  }

  const successMessage = formConfig.successMessage || 'Form submitted successfully';
  const submission = await FormSubmission.create({
    pageId: page._id,
    projectId: project._id,
    payload,
    submitter: currentUserId ? { userId: currentUserId } : undefined,
    status: 'success',
    message: successMessage,
  });

  ResponseHelper.created(
    ctx,
    {
      _id: submission._id,
      pageId: submission.pageId,
      payload: submission.payload,
      createdAt: submission.createdAt,
      message: successMessage,
      proxyResponse,
      resetAfterSubmit: formConfig.resetAfterSubmit ?? true,
      successAction: formConfig.successAction || 'none',
      redirectUrl: formConfig.redirectUrl || '',
    },
    successMessage
  );
});

router.get('/projects/:projectId/submissions', optionalAuthMiddleware, async (ctx: Context) => {
  const { projectId } = ctx.params;
  const status = typeof ctx.query.status === 'string' ? ctx.query.status : '';
  const pageId = typeof ctx.query.pageId === 'string' ? ctx.query.pageId : '';
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const currentUserId = ctx.state.user?.userId;
  const isAdmin = ctx.state.user?.role === 'admin';
  const hasAccess =
    isAdmin ||
    project.owner.toString() === currentUserId ||
    project.members.some((member) => member.userId.toString() === currentUserId);

  if (!hasAccess) {
    throw new AuthorizationError('Access denied');
  }

  const filter: Record<string, any> = { projectId };
  if (status) {
    filter.status = status;
  }
  if (pageId) {
    filter.pageId = pageId;
  }

  const submissions = await FormSubmission.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('pageId', 'name');

  ResponseHelper.success(ctx, submissions);
});

export default router;
