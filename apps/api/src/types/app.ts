import type { Hono } from 'hono';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
}

export interface AppVariables {
  auth: AuthContext;
}

export type AppType = {
  Variables: AppVariables;
};

// Helper type for creating typed Hono apps
export type TypedHono = Hono<AppType>;
