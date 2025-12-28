/**
 * Centralized Type Exports
 */

export * from './style';
export * from './document';
export * from './bom';

/**
 * Common Types
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'merchandiser' | 'factory' | 'viewer';
  organization: string;
  created_at: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
