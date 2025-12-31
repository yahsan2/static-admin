import type { ApiHandler } from './types';

/**
 * List all users with pagination
 */
export const listUsers: ApiHandler = async (ctx, req) => {
  const { auth } = ctx;

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
  const { auth } = ctx;
  const id = parseInt(req.params.id);

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
  const { auth } = ctx;
  const body = req.body as { email?: string; password?: string; name?: string };

  if (!body.email || !body.password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const user = await auth.createUser(body.email, body.password, body.name);

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
  const { auth } = ctx;
  const id = parseInt(req.params.id);
  const body = req.body as { email?: string; name?: string; password?: string };

  if (isNaN(id)) {
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    // Update user details (name, email)
    const user = await auth.updateUser(id, {
      email: body.email,
      name: body.name,
    });

    // Update password if provided
    if (body.password) {
      await auth.updatePassword(id, body.password);
    }

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
  const id = parseInt(req.params.id);

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

    await auth.deleteUser(id);

    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
};
