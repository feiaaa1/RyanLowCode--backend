import { redis } from '../config/redis';

export class CacheService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly PAGE_PREFIX = 'page:';
  private readonly PROJECT_PREFIX = 'project:';
  private readonly COMPONENT_LIST_KEY = 'components:list';
  private readonly USER_PROJECTS_PREFIX = 'user:';
  private readonly RATE_LIMIT_PREFIX = 'ratelimit:';

  // Session management
  async setSession(userId: string, token: string, ttl: number = 604800): Promise<void> {
    // TTL: 7 days in seconds
    await redis.setex(`${this.SESSION_PREFIX}${userId}`, ttl, JSON.stringify({ token, userId }));
  }

  async getSession(userId: string): Promise<{ token: string; userId: string } | null> {
    const data = await redis.get(`${this.SESSION_PREFIX}${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    await redis.del(`${this.SESSION_PREFIX}${userId}`);
  }

  // Page caching
  async setPage(pageId: string, data: any, ttl: number = 3600): Promise<void> {
    // TTL: 1 hour
    await redis.setex(`${this.PAGE_PREFIX}${pageId}`, ttl, JSON.stringify(data));
  }

  async getPage(pageId: string): Promise<any | null> {
    const data = await redis.get(`${this.PAGE_PREFIX}${pageId}`);
    return data ? JSON.parse(data) : null;
  }

  async deletePage(pageId: string): Promise<void> {
    await redis.del(`${this.PAGE_PREFIX}${pageId}`);
  }

  // Project caching
  async setProject(projectId: string, data: any, ttl: number = 3600): Promise<void> {
    // TTL: 1 hour
    await redis.setex(`${this.PROJECT_PREFIX}${projectId}`, ttl, JSON.stringify(data));
  }

  async getProject(projectId: string): Promise<any | null> {
    const data = await redis.get(`${this.PROJECT_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteProject(projectId: string): Promise<void> {
    await redis.del(`${this.PROJECT_PREFIX}${projectId}`);
  }

  // Component list caching
  async setComponentList(data: any, ttl: number = 86400): Promise<void> {
    // TTL: 24 hours
    await redis.setex(this.COMPONENT_LIST_KEY, ttl, JSON.stringify(data));
  }

  async getComponentList(): Promise<any | null> {
    const data = await redis.get(this.COMPONENT_LIST_KEY);
    return data ? JSON.parse(data) : null;
  }

  async deleteComponentList(): Promise<void> {
    await redis.del(this.COMPONENT_LIST_KEY);
  }

  // User projects caching
  async setUserProjects(userId: string, data: any, ttl: number = 1800): Promise<void> {
    // TTL: 30 minutes
    await redis.setex(`${this.USER_PROJECTS_PREFIX}${userId}:projects`, ttl, JSON.stringify(data));
  }

  async getUserProjects(userId: string): Promise<any | null> {
    const data = await redis.get(`${this.USER_PROJECTS_PREFIX}${userId}:projects`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserProjects(userId: string): Promise<void> {
    await redis.del(`${this.USER_PROJECTS_PREFIX}${userId}:projects`);
  }

  // Rate limiting
  async incrementRateLimit(key: string, ttl: number = 60): Promise<number> {
    const fullKey = `${this.RATE_LIMIT_PREFIX}${key}`;
    const current = await redis.incr(fullKey);

    if (current === 1) {
      await redis.expire(fullKey, ttl);
    }

    return current;
  }

  async getRateLimit(key: string): Promise<number> {
    const fullKey = `${this.RATE_LIMIT_PREFIX}${key}`;
    const value = await redis.get(fullKey);
    return value ? parseInt(value, 10) : 0;
  }

  // Generic operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, data);
    } else {
      await redis.set(key, data);
    }
  }

  async get(key: string): Promise<any | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  // Cache invalidation helpers
  async invalidatePageCache(pageId: string, projectId: string): Promise<void> {
    await Promise.all([
      this.deletePage(pageId),
      this.deleteProject(projectId),
    ]);
  }

  async invalidateProjectCache(projectId: string, userId: string): Promise<void> {
    await Promise.all([
      this.deleteProject(projectId),
      this.deleteUserProjects(userId),
    ]);
  }
}
