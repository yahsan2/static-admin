/** User role */
export type UserRole = 'admin' | 'editor';

/** Auth provider */
export type AuthProvider = 'password' | 'github';

/** User record */
export interface User {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  authProvider: AuthProvider;
  githubId?: number;
  githubUsername?: string;
  githubAvatarUrl?: string;
}

/** Session record */
export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

/** Password reset token record */
export interface PasswordResetToken {
  token: string;
  userId: number;
  email: string;
  expiresAt: Date;
}

/** User with password (internal) */
export interface UserWithPassword extends User {
  passwordHash: string;
}

/** Auth manager interface */
export interface AuthManager {
  /** Initialize database tables */
  initialize(): Promise<void>;

  /** Check if any users exist */
  hasAnyUsers(): Promise<boolean>;

  /** Create a new user */
  createUser(email: string, password: string, name?: string, role?: UserRole): Promise<User>;

  /** Authenticate user and create session */
  login(email: string, password: string): Promise<{ user: User; session: Session }>;

  /** Destroy a session */
  logout(sessionId: string): Promise<void>;

  /** Get user from session */
  getSession(sessionId: string): Promise<{ user: User; session: Session } | null>;

  /** Refresh session expiry */
  refreshSession(sessionId: string): Promise<Session | null>;

  /** Get user by ID */
  getUserById(id: number): Promise<User | null>;

  /** Get user by email */
  getUserByEmail(email: string): Promise<User | null>;

  /** Update user password */
  updatePassword(userId: number, newPassword: string): Promise<void>;

  /** Delete user */
  deleteUser(userId: number): Promise<void>;

  /** List all users with pagination */
  listUsers(options?: { page?: number; limit?: number }): Promise<{
    items: User[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>;

  /** Update user details (name, email, role) */
  updateUser(userId: number, data: { name?: string; email?: string; role?: UserRole }): Promise<User>;

  /** Count users by role */
  countUsersByRole(role: UserRole): Promise<number>;

  /** Create password reset token for email */
  createPasswordResetToken(email: string): Promise<PasswordResetToken | null>;

  /** Validate password reset token */
  validatePasswordResetToken(token: string): Promise<PasswordResetToken | null>;

  /** Reset password using token */
  resetPasswordWithToken(token: string, newPassword: string): Promise<boolean>;

  // OAuth methods

  /** Find user by GitHub ID */
  getUserByGitHubId(githubId: number): Promise<User | null>;

  /** Create or update user from GitHub OAuth */
  findOrCreateGitHubUser(githubUser: GitHubUserInfo, role?: UserRole): Promise<User>;

  /** Store OAuth token for user */
  storeOAuthToken(userId: number, provider: string, accessToken: string, scope?: string): Promise<void>;

  /** Get OAuth token for user */
  getOAuthToken(userId: number, provider: string): Promise<OAuthToken | null>;

  /** Delete OAuth token */
  deleteOAuthToken(userId: number, provider: string): Promise<void>;

  /** Create OAuth state for CSRF protection */
  createOAuthState(redirectUri?: string): Promise<string>;

  /** Validate and consume OAuth state */
  validateOAuthState(state: string): Promise<{ redirectUri: string | null } | null>;

  /** Create session for OAuth user (without password) */
  createSessionForUser(userId: number): Promise<Session>;
}

/** Remote database configuration (Turso, libSQL, etc.) */
export interface RemoteDatabaseConfig {
  url: string;
  authToken: string;
}

/** GitHub OAuth configuration */
export interface GitHubOAuthConfig {
  /** GitHub OAuth App Client ID */
  clientId: string;
  /** GitHub OAuth App Client Secret */
  clientSecret: string;
  /** OAuth callback URL (e.g., https://example.com/api/auth/github/callback) */
  callbackUrl: string;
  /** Required scopes (default: ['repo']) */
  scopes?: string[];
  /** Allow only collaborators of the target repo to register (default: true) */
  requireCollaborator?: boolean;
}

/** Auth config */
export interface AuthConfig {
  /** Path to SQLite database file (for local development) */
  database?: string;
  /** Remote database configuration (for Edge/production) */
  remote?: RemoteDatabaseConfig;
  /** Session expiry in seconds (default: 7 days) */
  sessionExpiry?: number;
  /** GitHub OAuth configuration */
  github?: GitHubOAuthConfig;
}

/** GitHub user info from API */
export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
}

/** OAuth token record */
export interface OAuthToken {
  id: number;
  userId: number;
  provider: string;
  accessToken: string;
  scope: string | null;
  createdAt: Date;
}
