import type { ApiHandler } from './types';
import type { UserRole } from '../auth/types';

/**
 * List all users with pagination
 */
export const listUsers: ApiHandler = async (ctx, req) => {
  const { auth, user: currentUser } = ctx;

  // Admin only
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await auth.listUsers({ page, limit });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list users',
    };
  }
};

/**
 * Get a single user by ID
 */
export const getUser: ApiHandler = async (ctx, req) => {
  const { auth, user: currentUser } = ctx;

  // Admin only
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  const id = parseInt(req.params.id!, 10);

  if (isNaN(id)) {
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    const user = await auth.getUserById(id);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
  }
};

/**
 * Create a new user
 */
export const createUser: ApiHandler = async (ctx, req) => {
  const { auth, user: currentUser } = ctx;

  // Admin only
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  const body = req.body as { email?: string; password?: string; name?: string; role?: UserRole };

  if (!body.email || !body.password) {
    return { success: false, error: 'Email and password are required' };
  }

  // Validate role if provided
  if (body.role && !['admin', 'editor'].includes(body.role)) {
    return { success: false, error: 'Invalid role. Must be admin or editor' };
  }

  try {
    const user = await auth.createUser(body.email, body.password, body.name, body.role || 'editor');

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    };
  }
};

/**
 * Update a user
 */
export const updateUser: ApiHandler = async (ctx, req) => {
  const { auth, user: currentUser } = ctx;

  // Admin only
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  const id = parseInt(req.params.id!, 10);
  const body = req.body as { email?: string; name?: string; role?: UserRole };

  if (isNaN(id)) {
    return { success: false, error: 'Invalid user ID' };
  }

  // Validate role if provided
  if (body.role && !['admin', 'editor'].includes(body.role)) {
    return { success: false, error: 'Invalid role. Must be admin or editor' };
  }

  try {
    // Update user details (name, email, role)
    // Note: Password changes are handled via forgot-password flow
    const user = await auth.updateUser(id, {
      email: body.email,
      name: body.name,
      role: body.role,
    });

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
};

/**
 * Delete a user
 */
export const deleteUser: ApiHandler = async (ctx, req) => {
  const { auth, user: currentUser } = ctx;

  // Admin only
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Forbidden: Admin access required' };
  }

  const id = parseInt(req.params.id!, 10);

  if (isNaN(id)) {
    return { success: false, error: 'Invalid user ID' };
  }

  // Prevent self-deletion
  if (currentUser?.id === id) {
    return { success: false, error: 'Cannot delete your own account' };
  }

  try {
    // Check if user exists
    const user = await auth.getUserById(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Prevent deletion of last admin
    if (user.role === 'admin') {
      const adminCount = await auth.countUsersByRole('admin');
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot delete the last admin user' };
      }
    }

    await auth.deleteUser(id);

    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
};
