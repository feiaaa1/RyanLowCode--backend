import { Context } from 'koa';
import { ApiResponse } from '../types';

export class ResponseHelper {
  static success<T>(ctx: Context, data: T, message?: string, statusCode: number = 200): void {
    ctx.status = statusCode;
    ctx.body = {
      success: true,
      data,
      message,
    } as ApiResponse<T>;
  }

  static error(ctx: Context, message: string, statusCode: number = 400, error?: any): void {
    ctx.status = statusCode;
    ctx.body = {
      success: false,
      message,
      error: error?.message || error,
    } as ApiResponse;
  }

  static created<T>(ctx: Context, data: T, message: string = 'Resource created successfully'): void {
    this.success(ctx, data, message, 201);
  }

  static noContent(ctx: Context): void {
    ctx.status = 204;
  }

  static unauthorized(ctx: Context, message: string = 'Unauthorized'): void {
    this.error(ctx, message, 401);
  }

  static forbidden(ctx: Context, message: string = 'Forbidden'): void {
    this.error(ctx, message, 403);
  }

  static notFound(ctx: Context, message: string = 'Resource not found'): void {
    this.error(ctx, message, 404);
  }

  static serverError(ctx: Context, message: string = 'Internal server error', error?: any): void {
    this.error(ctx, message, 500, error);
  }
}
