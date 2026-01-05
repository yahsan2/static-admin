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

/**
 * Request password reset
 */
export const requestPasswordReset: ApiHandler = async (ctx, req) => {
  const { auth, mail, baseUrl } = ctx;
  const body = req.body as { email?: string };

  if (!body.email) {
    return { success: false, error: 'Email is required' };
  }

  try {
    // Create reset token (returns null if user not found)
    const resetToken = await auth.createPasswordResetToken(body.email);

    // Always return success to prevent email enumeration
    if (!resetToken) {
      return { success: true, data: { message: 'If the email exists, a reset link has been sent' } };
    }

    // Send email if mail service is available
    if (mail) {
      const resetUrl = `${baseUrl || ''}/reset-password?token=${resetToken.token}`;
      const result = await mail.sendPasswordResetEmail(body.email, resetUrl);

      return {
        success: true,
        data: {
          message: 'If the email exists, a reset link has been sent',
          // Include preview URL in development (Ethereal)
          ...(result.previewUrl && { previewUrl: result.previewUrl }),
        },
      };
    }

    // If no mail service, return token directly (development only)
    return {
      success: true,
      data: {
        message: 'Password reset token created',
        token: resetToken.token,
        expiresAt: resetToken.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request password reset',
    };
  }
};

/**
 * Reset password with token
 */
export const resetPassword: ApiHandler = async (ctx, req) => {
  const { auth } = ctx;
  const body = req.body as { token?: string; password?: string };

  if (!body.token || !body.password) {
    return { success: false, error: 'Token and password are required' };
  }

  if (body.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  try {
    const success = await auth.resetPasswordWithToken(body.token, body.password);

    if (!success) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    return { success: true, data: { message: 'Password has been reset successfully' } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password',
    };
  }
};

/**
 * Change password for authenticated user
 */
export const changePassword: ApiHandler = async (ctx, req) => {
  const { auth, user } = ctx;
  const body = req.body as { currentPassword?: string; newPassword?: string };

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!body.currentPassword || !body.newPassword) {
    return { success: false, error: 'Current password and new password are required' };
  }

  if (body.newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  if (body.currentPassword === body.newPassword) {
    return { success: false, error: 'New password must be different from current password' };
  }

  // GitHub OAuth users cannot change password
  if (user.authProvider === 'github') {
    return { success: false, error: 'Password change is not available for GitHub OAuth users' };
  }

  try {
    // Verify current password
    const isValid = await auth.verifyPassword(user.id, body.currentPassword);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update password
    await auth.updatePassword(user.id, body.newPassword);

    return { success: true, data: { message: 'Password has been changed successfully' } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password',
    };
  }
};
