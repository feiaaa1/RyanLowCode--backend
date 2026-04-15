import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions, Secret } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../config';
import { AuthenticationError, ConflictError } from '../utils/errors';
import { CacheService } from './cache.service';

const cacheService = new CacheService();

export class AuthService {
  async register(email: string, password: string, username: string): Promise<{ user: IUser; token: string }> {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
    });

    // Generate token
    const token = this.generateToken(user);

    // Store session in Redis
    await cacheService.setSession(user._id.toString(), token);

    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user);

    // Store session in Redis
    await cacheService.setSession(user._id.toString(), token);

    return { user, token };
  }

  async logout(userId: string): Promise<void> {
    await cacheService.deleteSession(userId);
  }

  async refreshToken(oldToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(oldToken, config.jwt.secret) as any;

      // Check if session exists
      const session = await cacheService.getSession(decoded.userId);
      if (!session) {
        throw new AuthenticationError('Session expired');
      }

      // Generate new token
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      const newToken = this.generateToken(user);

      // Update session
      await cacheService.setSession(user._id.toString(), newToken);

      return newToken;
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }

  private generateToken(user: IUser): string {
    const signOptions: SignOptions = {
      expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      config.jwt.secret as Secret,
      signOptions
    );
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }
}
