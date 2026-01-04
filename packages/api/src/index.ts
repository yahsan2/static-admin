// @static-admin/api
// API handlers and authentication

// Handlers
export { createApiHandlers } from './handlers';
export { initiateGitHubOAuth, handleGitHubCallback, getGitHubOAuthConfig } from './handlers';
export type { ApiHandlers, ApiRequest, ApiResponse, ApiContext } from './handlers/types';

// Auth
export { createAuthManager } from './auth/manager';
export type {
  AuthManager,
  User,
  Session,
  PasswordResetToken,
  AuthProvider,
  GitHubOAuthConfig,
  GitHubUserInfo,
  OAuthToken,
} from './auth/types';

// GitHub OAuth utilities
export {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  isRepoCollaborator,
  checkCollaboratorAccess,
} from './auth/github';

// Mail
export { createMailService } from './mail';
export type { MailService, MailConfig } from './mail';
