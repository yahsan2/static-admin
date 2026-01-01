/** User role */
export type UserRole = 'admin' | 'editor';

/** User record */
export interface User {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
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
}

/** Remote database configuration (Turso, libSQL, etc.) */
export interface RemoteDatabaseConfig {
  url: string;
  authToken: string;
}

/** Auth config */
export interface AuthConfig {
  /** Path to SQLite database file (for local development) */
  database?: string;
  /** Remote database configuration (for Edge/production) */
  remote?: RemoteDatabaseConfig;
  /** Session expiry in seconds (default: 7 days) */
  sessionExpiry?: number;
}
