import type { ApiContext, ApiRequest, ApiResponse } from './types';
import type { User } from '../auth/types';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  checkCollaboratorAccess,
} from '../auth/github';

/**
 * Initiate GitHub OAuth flow
 * Generates state and redirects to GitHub authorization URL
 */
export async function initiateGitHubOAuth(
  ctx: ApiContext,
  req: ApiRequest
): Promise<ApiResponse<{ redirectUrl: string }>> {
  const githubConfig = ctx.config.auth?.github;
  if (!githubConfig) {
    return {
      success: false,
      error: 'GitHub OAuth is not configured',
    };
  }

  // Create state for CSRF protection
  const state = await ctx.auth.createOAuthState(req.query.redirect as string | undefined);

  // Build authorization URL
  const redirectUrl = buildAuthorizationUrl(githubConfig, state);

  return {
    success: true,
    data: { redirectUrl },
  };
}

/**
 * Handle GitHub OAuth callback
 * Exchanges code for token, verifies collaborator status, creates/updates user
 */
export async function handleGitHubCallback(
  ctx: ApiContext,
  req: ApiRequest
): Promise<ApiResponse<{ user: User; sessionId: string; expiresAt: string; redirectUrl?: string }>> {
  const githubConfig = ctx.config.auth?.github;
  if (!githubConfig) {
    return {
      success: false,
      error: 'GitHub OAuth is not configured',
    };
  }

  const { code, state, error: oauthError, error_description: errorDescription } = req.query;

  // Handle OAuth errors from GitHub
  if (oauthError) {
    return {
      success: false,
      error: `GitHub OAuth error: ${errorDescription || oauthError}`,
    };
  }

  // Validate required parameters
  if (!code || typeof code !== 'string') {
    return {
      success: false,
      error: 'Missing authorization code',
    };
  }

  if (!state || typeof state !== 'string') {
    return {
      success: false,
      error: 'Missing state parameter',
    };
  }

  // Validate state
  const stateData = await ctx.auth.validateOAuthState(state);
  if (!stateData) {
    return {
      success: false,
      error: 'Invalid or expired state',
    };
  }

  try {
    // Exchange code for token
    const tokenResult = await exchangeCodeForToken(githubConfig, code);

    // Fetch GitHub user info
    const githubUser = await fetchGitHubUser(tokenResult.accessToken);

    // Check collaborator access if required
    if (githubConfig.requireCollaborator !== false) {
      const storageConfig = ctx.config.storage;
      if (storageConfig.kind !== 'github') {
        return {
          success: false,
          error: 'GitHub OAuth requires GitHub storage to be configured for collaborator verification',
        };
      }

      const hasAccess = await checkCollaboratorAccess(
        tokenResult.accessToken,
        storageConfig.owner,
        storageConfig.repo,
        githubUser.login
      );

      if (!hasAccess) {
        return {
          success: false,
          error: `User ${githubUser.login} is not a collaborator of ${storageConfig.owner}/${storageConfig.repo}`,
        };
      }
    }

    // Determine role for new users
    const hasUsers = await ctx.auth.hasAnyUsers();
    const role = hasUsers ? 'editor' : 'admin';

    // Create or update user
    const user = await ctx.auth.findOrCreateGitHubUser(githubUser, role);

    // Store OAuth token
    await ctx.auth.storeOAuthToken(user.id, 'github', tokenResult.accessToken, tokenResult.scope);

    // Create session
    const session = await ctx.auth.createSessionForUser(user.id);

    return {
      success: true,
      data: {
        user,
        sessionId: session.id,
        expiresAt: session.expiresAt.toISOString(),
        redirectUrl: stateData.redirectUri ?? undefined,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth callback failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get GitHub OAuth configuration (public, for UI)
 */
export async function getGitHubOAuthConfig(
  ctx: ApiContext,
  _req: ApiRequest
): Promise<ApiResponse<{ enabled: boolean; clientId?: string }>> {
  const githubConfig = ctx.config.auth?.github;

  return {
    success: true,
    data: {
      enabled: !!githubConfig,
      clientId: githubConfig?.clientId,
    },
  };
}
