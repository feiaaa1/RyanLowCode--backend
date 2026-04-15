# Vue3 Low-Code Platform - Backend Service

Backend service for Vue3 Low-Code Platform built with Koa + MongoDB + Redis.

## Features

- 🔐 JWT Authentication with Redis session management
- 📦 Project and Page management
- 🎨 Component library system
- 💾 MongoDB for data persistence
- ⚡ Redis caching for performance
- 📝 Version history for pages
- 🔒 Role-based access control
- 🚀 RESTful API design

## Tech Stack

- **Framework**: Koa 2.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB 6.x with Mongoose
- **Cache**: Redis 7.x with ioredis
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Logging**: Winston

## Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- Redis >= 7.x
- pnpm or npm

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lowcode

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:userId` - Remove member

### Pages
- `POST /api/pages` - Create page
- `GET /api/pages?projectId=xxx` - List pages
- `GET /api/pages/:id` - Get page with formNodeTree
- `PUT /api/pages/:id` - Update page
- `DELETE /api/pages/:id` - Delete page
- `POST /api/pages/:id/publish` - Publish page
- `GET /api/pages/:id/history` - Get version history
- `POST /api/pages/:id/restore/:version` - Restore version
- `POST /api/pages/:id/duplicate` - Duplicate page

### Health Check
- `GET /health` - Server health status

## Project Structure

```
service/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Mongoose models
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware functions
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript definitions
│   └── app.ts           # Application entry point
├── logs/                # Log files
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## Database Models

### User
- email, password, username, role, avatar

### Project
- name, description, owner, members, isPublic

### Page
- name, projectId, formNodeTree, version, status

### Component
- type, name, category, configPanelList, nodeType

### DataSource
- name, projectId, type, config

### History
- pageId, version, formNodeTree, changedBy

## Redis Caching Strategy

- `session:{userId}` - User sessions (7 days TTL)
- `page:{pageId}` - Page cache (1 hour TTL)
- `project:{projectId}` - Project cache (1 hour TTL)
- `components:list` - Component list (24 hours TTL)
- `user:{userId}:projects` - User projects (30 min TTL)

## Security

- Passwords hashed with bcryptjs
- JWT tokens with expiration
- Redis session validation
- Role-based access control
- CORS protection
- Input validation with Joi

## License

ISC
