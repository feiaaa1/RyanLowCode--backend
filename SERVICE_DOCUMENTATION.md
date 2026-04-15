# LowCode Platform - 后端服务文档

## 项目概述

这是一个基于 Vue3 的低代码平台后端服务，使用 Koa 框架构建，提供用户认证、项目管理、页面编辑、版本控制等核心功能。

### 技术栈

- **框架**: Koa 2.15.3
- **语言**: TypeScript 5.7.2
- **数据库**: MongoDB (Mongoose 8.7.3)
- **缓存**: Redis (ioredis 5.4.1)
- **认证**: JWT (jsonwebtoken 9.0.2)
- **密码加密**: bcryptjs 2.4.3
- **日志**: Winston 3.17.0
- **实时通信**: Socket.io 4.8.1 / koa-websocket 7.0.0

---

## 系统架构

```
service/
├── src/
│   ├── app.ts                    # 应用入口
│   ├── config/                   # 配置文件
│   │   ├── index.ts             # 环境变量配置
│   │   ├── database.ts          # MongoDB 连接
│   │   └── redis.ts             # Redis 客户端
│   ├── models/                   # 数据模型
│   ├── controllers/              # 控制器
│   ├── routes/                   # 路由定义
│   ├── middleware/               # 中间件
│   ├── services/                 # 业务逻辑服务
│   ├── types/                    # TypeScript 类型定义
│   └── utils/                    # 工具函数
```

---

## 数据库设计

### 1. User (用户表)

用户账户信息和权限管理。

```typescript
{
  email: string;              // 邮箱 (唯一, 必填)
  password: string;           // 密码哈希 (必填)
  username: string;           // 用户名 (必填)
  role: 'admin' | 'user';    // 角色 (默认: user)
  avatar?: string;            // 头像 URL
  createdAt: Date;            // 创建时间
  updatedAt: Date;            // 更新时间
}
```

**索引**:
- `email`: 单字段索引
- `createdAt`: 降序索引

---

### 2. Project (项目表)

低代码项目的基本信息和成员管理。

```typescript
{
  name: string;                    // 项目名称 (必填)
  description?: string;            // 项目描述
  owner: ObjectId;                 // 项目所有者 (ref: User)
  members: [{                      // 项目成员列表
    userId: ObjectId;              // 用户 ID (ref: User)
    role: 'owner' | 'editor' | 'viewer';  // 成员角色
  }];
  thumbnail?: string;              // 项目缩略图
  isPublic: boolean;               // 是否公开 (默认: false)
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

**索引**:
- `owner`: 单字段索引
- `createdAt`: 降序索引
- `owner + name`: 复合索引

**权限说明**:
- `owner`: 完全控制权限（创建、编辑、删除、成员管理）
- `editor`: 编辑权限（创建、编辑页面）
- `viewer`: 只读权限

---

### 3. Page (页面表)

低代码页面的配置和状态管理。

```typescript
{
  name: string;                    // 页面名称 (必填)
  projectId: ObjectId;             // 所属项目 (ref: Project)
  formNodeTree: FormNode[];        // 表单节点树 (页面结构)
  thumbnail?: string;              // 页面缩略图
  version: number;                 // 版本号 (默认: 1)
  status: 'draft' | 'published';  // 状态 (默认: draft)
  createdBy: ObjectId;             // 创建者 (ref: User)
  updatedBy: ObjectId;             // 最后更新者 (ref: User)
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

**索引**:
- `projectId`: 单字段索引
- `createdAt`: 降序索引
- `projectId + name`: 复合索引
- `status`: 单字段索引

**FormNode 结构**:
```typescript
{
  id: string;                      // 节点唯一 ID
  name: string;                    // 节点名称
  type: string;                    // 组件类型
  nodeType: string | string[];     // 节点类型
  configs: {                       // 配置信息
    props?: Record<string, any>;   // 属性配置
    validate?: Record<string, any>; // 验证规则
    style?: Record<string, any>;   // 样式配置
  };
  configPanelList: ConfigPanelList; // 配置面板列表
  childrens?: FormNode[];          // 子节点
}
```

---

### 4. History (历史版本表)

页面的版本历史记录，支持版本回滚。

```typescript
{
  pageId: ObjectId;                // 页面 ID (ref: Page)
  version: number;                 // 版本号 (必填)
  formNodeTree: FormNode[];        // 该版本的节点树
  changedBy: ObjectId;             // 修改者 (ref: User)
  changeDescription?: string;      // 变更描述
  createdAt: Date;                 // 创建时间
}
```

**索引**:
- `pageId + version`: 复合索引（降序）
- `createdAt`: 降序索引

---

### 5. Component (组件表)

自定义组件库和内置组件的定义。

```typescript
{
  type: string;                    // 组件类型 (唯一, 必填)
  name: string;                    // 组件名称 (必填)
  category: string;                // 组件分类 (必填)
  icon?: string;                   // 组件图标
  configPanelList: ConfigPanelList; // 配置面板定义
  nodeType: string[];              // 节点类型列表
  isBuiltIn: boolean;              // 是否内置组件 (默认: false)
  isPublic: boolean;               // 是否公开 (默认: true)
  createdBy?: ObjectId;            // 创建者 (ref: User)
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

**索引**:
- `type`: 单字段索引
- `category`: 单字段索引
- `isPublic`: 单字段索引

---

### 6. DataSource (数据源表)

项目的数据源配置（API、数据库、静态数据）。

```typescript
{
  name: string;                    // 数据源名称 (必填)
  projectId: ObjectId;             // 所属项目 (ref: Project)
  type: 'api' | 'database' | 'static'; // 数据源类型
  config: {                        // 配置信息
    url?: string;                  // API 地址
    method?: string;               // HTTP 方法
    headers?: Record<string, string>; // 请求头
    body?: any;                    // 请求体
    data?: any;                    // 静态数据
  };
  createdBy: ObjectId;             // 创建者 (ref: User)
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

**索引**:
- `projectId`: 单字段索引
- `type`: 单字段索引

---

## API 接口设计

### 基础响应格式

```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}
```

---

### 认证模块 (`/api/auth`)

#### 1. 用户注册
```
POST /api/auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "张三"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "张三",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

---

#### 2. 用户登录
```
POST /api/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**: 同注册接口

---

#### 3. 登出
```
POST /api/auth/logout
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### 4. 刷新 Token
```
POST /api/auth/refresh
```

**请求体**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

---

#### 5. 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "张三",
    "role": "user",
    "avatar": "https://example.com/avatar.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 项目模块 (`/api/projects`)

所有接口需要认证 (`Authorization: Bearer {token}`)

#### 1. 创建项目
```
POST /api/projects
```

**请求体**:
```json
{
  "name": "我的项目",
  "description": "项目描述",
  "isPublic": false
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "我的项目",
    "description": "项目描述",
    "owner": "507f1f77bcf86cd799439012",
    "members": [
      {
        "userId": "507f1f77bcf86cd799439012",
        "role": "owner"
      }
    ],
    "isPublic": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Project created successfully"
}
```

---

#### 2. 获取项目列表
```
GET /api/projects
```

**响应**: 返回用户拥有、参与或公开的所有项目

---

#### 3. 获取项目详情
```
GET /api/projects/:id
```

**响应**: 返回项目详细信息（包含 owner 的用户信息）

---

#### 4. 更新项目
```
PUT /api/projects/:id
```

**请求体**:
```json
{
  "name": "更新后的项目名",
  "description": "更新后的描述",
  "isPublic": true
}
```

**权限**: owner 或 editor

---

#### 5. 删除项目
```
DELETE /api/projects/:id
```

**权限**: 仅 owner

---

#### 6. 添加成员
```
POST /api/projects/:id/members
```

**请求体**:
```json
{
  "userId": "507f1f77bcf86cd799439013",
  "role": "editor"
}
```

**权限**: 仅 owner

---

#### 7. 移除成员
```
DELETE /api/projects/:id/members/:userId
```

**权限**: 仅 owner

---

### 页面模块 (`/api/pages`)

所有接口需要认证 (`Authorization: Bearer {token}`)

#### 1. 创建页面
```
POST /api/pages
```

**请求体**:
```json
{
  "name": "首页",
  "projectId": "507f1f77bcf86cd799439011",
  "formNodeTree": [
    {
      "id": "node-1",
      "name": "表单容器",
      "type": "FormContainer",
      "nodeType": "container",
      "configs": {
        "props": {},
        "style": {}
      },
      "configPanelList": {},
      "childrens": []
    }
  ]
}
```

**响应**: 返回创建的页面信息

**说明**: 创建页面时会自动创建初始版本历史记录

---

#### 2. 获取页面列表
```
GET /api/pages?projectId={projectId}
```

**响应**: 返回项目下的所有页面（不包含 formNodeTree）

---

#### 3. 获取页面详情
```
GET /api/pages/:id
```

**响应**: 返回完整的页面信息（包含 formNodeTree）

**缓存**: 使用 Redis 缓存，TTL 1小时

---

#### 4. 更新页面
```
PUT /api/pages/:id
```

**请求体**:
```json
{
  "name": "更新后的页面名",
  "formNodeTree": [...],
  "changeDescription": "添加了新的表单组件"
}
```

**说明**: 
- 更新时会自动增加版本号
- 创建新的历史记录
- 清除相关缓存

---

#### 5. 删除页面
```
DELETE /api/pages/:id
```

**权限**: owner 或 editor

---

#### 6. 发布页面
```
POST /api/pages/:id/publish
```

**说明**: 将页面状态从 `draft` 改为 `published`

---

#### 7. 获取版本历史
```
GET /api/pages/:id/history
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "pageId": "507f1f77bcf86cd799439011",
      "version": 2,
      "formNodeTree": [...],
      "changedBy": {
        "username": "张三",
        "email": "user@example.com"
      },
      "changeDescription": "添加了新的表单组件",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### 8. 恢复历史版本
```
POST /api/pages/:id/restore/:version
```

**说明**: 
- 将指定版本的内容恢复到当前页面
- 创建新的版本记录
- 版本号递增

---

#### 9. 复制页面
```
POST /api/pages/:id/duplicate
```

**响应**: 返回新创建的页面（名称后缀 " (Copy)"）

---

## 中间件

### 1. 认证中间件 (`authMiddleware`)

验证 JWT token 和 Redis session。

**流程**:
1. 从 `Authorization` header 提取 token
2. 验证 JWT 签名和过期时间
3. 检查 Redis 中的 session 是否存在且匹配
4. 将用户信息附加到 `ctx.state.user`

---

### 2. 错误处理中间件 (`errorMiddleware`)

全局错误捕获和统一响应格式。

**自定义错误类型**:
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (400)

---

### 3. 日志中间件 (`loggerMiddleware`)

记录 HTTP 请求日志（使用 Winston）。

---

### 4. 角色权限中间件 (`requireRole`)

基于角色的访问控制。

```typescript
router.get('/admin', authMiddleware, requireRole('admin'), handler);
```

---

## 缓存策略

使用 Redis 实现多层缓存：

### 缓存键前缀

- `session:` - 用户会话 (TTL: 7天)
- `page:` - 页面数据 (TTL: 1小时)
- `project:` - 项目数据 (TTL: 1小时)
- `user:{userId}:projects` - 用户项目列表 (TTL: 30分钟)
- `components:list` - 组件列表 (TTL: 24小时)
- `ratelimit:` - 限流计数器 (TTL: 60秒)

### 缓存失效策略

- **页面更新**: 清除页面缓存 + 项目缓存
- **项目更新**: 清除项目缓存 + 用户项目列表缓存
- **成员变更**: 清除相关用户的项目列表缓存

---

## 环境变量配置

```bash
# 环境
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lowcode
MONGODB_TEST_URI=mongodb://localhost:27017/lowcode_test

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:5173

# 限流
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# 日志
LOG_LEVEL=debug
```

---

## 安全特性

### 1. 密码安全
- 使用 bcryptjs 进行密码哈希（salt rounds: 10）
- 密码不会在响应中返回

### 2. JWT 认证
- Token 包含用户 ID、邮箱、角色
- 支持 Token 刷新机制
- Token 过期时间可配置

### 3. Session 管理
- JWT + Redis 双重验证
- 登出时清除 Redis session
- Session 自动过期

### 4. 权限控制
- 基于角色的访问控制（RBAC）
- 项目级别的成员权限管理
- 资源级别的访问验证

### 5. CORS 配置
- 可配置的跨域来源
- 支持凭证传递

---

## 启动和部署

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 生产环境启动
pnpm start
```

### 依赖服务

1. **MongoDB**: 确保 MongoDB 服务运行在 `localhost:27017`
2. **Redis**: 确保 Redis 服务运行在 `localhost:6379`

---

## 性能优化

### 1. 数据库优化
- 合理的索引设计
- 使用 `select()` 排除不必要的字段
- 分页查询支持

### 2. 缓存优化
- 多层缓存策略
- 智能缓存失效
- 缓存预热

### 3. 查询优化
- 使用 `populate()` 减少查询次数
- 避免 N+1 查询问题

---

## 扩展功能

### 1. 实时通信
- 集成 Socket.io 和 koa-websocket
- 支持实时协作编辑

### 2. 限流保护
- 基于 Redis 的限流计数器
- 可配置的限流策略

### 3. 日志系统
- Winston 日志框架
- 分级日志记录
- 请求追踪

---

## 待实现功能

1. **组件管理 API**: Component 模型的 CRUD 接口
2. **数据源管理 API**: DataSource 模型的 CRUD 接口
3. **文件上传**: 缩略图和头像上传
4. **WebSocket 实时协作**: 多人同时编辑页面
5. **权限细化**: 更细粒度的权限控制
6. **审计日志**: 操作记录追踪
7. **数据备份**: 自动备份机制

---

## 错误码说明

| HTTP 状态码 | 错误类型 | 说明 |
|------------|---------|------|
| 200 | Success | 请求成功 |
| 201 | Created | 资源创建成功 |
| 400 | ValidationError | 请求参数验证失败 |
| 401 | AuthenticationError | 认证失败或 Token 无效 |
| 403 | AuthorizationError | 权限不足 |
| 404 | NotFoundError | 资源不存在 |
| 409 | ConflictError | 资源冲突（如邮箱已存在） |
| 500 | InternalServerError | 服务器内部错误 |

---

## 联系方式

如有问题或建议，请联系开发团队。
