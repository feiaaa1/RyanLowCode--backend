import { FormNode } from './formNode.types';

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User types
export interface UserPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

// Project types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddMemberRequest {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
}

// Page types
export interface CreatePageRequest {
  name: string;
  projectId: string;
  formNodeTree: FormNode[];
}

export interface UpdatePageRequest {
  name?: string;
  formNodeTree?: FormNode[];
  status?: 'draft' | 'published';
}

// Component types
export interface CreateComponentRequest {
  type: string;
  name: string;
  category: string;
  icon?: string;
  configPanelList: any;
  nodeType: string[];
  isPublic?: boolean;
}

// DataSource types
export interface CreateDataSourceRequest {
  name: string;
  projectId: string;
  type: 'api' | 'database' | 'static';
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    data?: any;
  };
}

// Code generation types
export interface GenerateCodeRequest {
  pageId: string;
  format: 'vue' | 'html' | 'json';
}

export interface GenerateCodeResponse {
  code: string;
  filename: string;
}
