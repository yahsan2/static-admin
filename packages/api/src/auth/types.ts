/** User record */
export interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
}

/** Session record */
export interface Session {
  id: string;
  userId: number;
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

  /** Create a new user */
  createUser(email: string, password: string, name?: string): Promise<User>;

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
}

/** Auth config */
export interface AuthConfig {
  database: string;
  sessionExpiry?: number;
}
