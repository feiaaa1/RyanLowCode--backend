import { Context } from 'koa';
import { AuthService } from '../services/auth.service';
import { ResponseHelper } from '../utils/response';
import { LoginRequest, RegisterRequest } from '../types';

const authService = new AuthService();

export class AuthController {
  async register(ctx: Context): Promise<void> {
    const { email, password, username } = ctx.request.body as RegisterRequest;

    const { user, token } = await authService.register(email, password, username);

    // Remove password from response
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    ResponseHelper.created(ctx, { user: userResponse, token }, 'User registered successfully');
  }

  async login(ctx: Context): Promise<void> {
    const { email, password } = ctx.request.body as LoginRequest;

    const { user, token } = await authService.login(email, password);

    // Remove password from response
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    ResponseHelper.success(ctx, { user: userResponse, token }, 'Login successful');
  }

  async logout(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;

    await authService.logout(userId);

    ResponseHelper.success(ctx, null, 'Logout successful');
  }

  async refreshToken(ctx: Context): Promise<void> {
    const { token } = ctx.request.body as { token: string };

    const newToken = await authService.refreshToken(token);

    ResponseHelper.success(ctx, { token: newToken }, 'Token refreshed successfully');
  }

  async getCurrentUser(ctx: Context): Promise<void> {
    const userId = ctx.state.user.userId;

    const User = require('../models/User').User;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      ResponseHelper.notFound(ctx, 'User not found');
      return;
    }

    ResponseHelper.success(ctx, user);
  }
}
