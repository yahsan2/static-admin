// @static-admin/api
// API handlers and authentication

// Handlers
export { createApiHandlers } from './handlers';
export type { ApiHandlers, ApiRequest, ApiResponse, ApiContext } from './handlers/types';

// Auth
export { createAuthManager } from './auth/manager';
export type { AuthManager, User, Session, PasswordResetToken } from './auth/types';

// Mail
export { createMailService } from './mail';
export type { MailService, MailConfig } from './mail';
