import type { ApiContext, ApiRequest, ApiResponse, ApiHandler } from './types';

/**
 * Login handler
 */
export const login: ApiHandler = async (ctx, req) => {
  const { auth } = ctx;
  const body = req.body as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const result = await auth.login(body.email, body.password);

    return {
      success: true,
      data: {
        user: result.user,
        sessionId: result.session.id,
        expiresAt: result.session.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
};

/**
 * Logout handler
 */
export const logout: ApiHandler = async (ctx, req) => {
  const { auth } = ctx;
  const body = req.body as { sessionId?: string };

  if (!body.sessionId) {
    return { success: false, error: 'Session ID is required' };
  }

  try {
    await auth.logout(body.sessionId);
    return { success: true, data: { loggedOut: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
  }
};

/**
 * Get current user
 */
export const getMe: ApiHandler = async (ctx) => {
  const { user } = ctx;

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  return { success: true, data: user };
};

/**
 * Check if installation is needed
 */
export const checkInstall: ApiHandler = async (ctx) => {
  const { auth } = ctx;

  try {
    const hasUsers = await auth.hasAnyUsers();
    return {
      success: true,
      data: {
        installed: hasUsers,
        needsSetup: !hasUsers,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check installation status',
    };
  }
};

/**
 * Setup initial admin user
 */
export const setupAdmin: ApiHandler = async (ctx, req) => {
  const { auth } = ctx;
  const body = req.body as { email?: string; password?: string; name?: string };

  if (!body.email || !body.password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    // Check if any users already exist
    const hasUsers = await auth.hasAnyUsers();
    if (hasUsers) {
      return { success: false, error: 'Admin user already exists' };
    }

    // Create the admin user with 'admin' role
    const user = await auth.createUser(body.email, body.password, body.name, 'admin');

    // Auto-login the newly created admin
    const result = await auth.login(body.email, body.password);

    return {
      success: true,
      data: {
        user: result.user,
        sessionId: result.session.id,
        expiresAt: result.session.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin user',
    };
  }
};
