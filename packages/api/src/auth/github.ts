import type { GitHubUserInfo, GitHubOAuthConfig } from './types';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface GitHubApiUserResponse {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
}

interface GitHubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface GitHubRepoResponse {
  permissions?: {
    push?: boolean;
  };
}

/**
 * Build GitHub OAuth authorization URL
 */
export function buildAuthorizationUrl(config: GitHubOAuthConfig, state: string): string {
  const scopes = config.scopes ?? ['repo'];
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: scopes.join(' '),
    state,
  });
  return `${GITHUB_OAUTH_URL}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: GitHubOAuthConfig,
  code: string
): Promise<{ accessToken: string; scope: string; tokenType: string }> {
  const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.status}`);
  }

  const data = (await response.json()) as GitHubTokenResponse;

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

/**
 * Fetch GitHub user info using access token
 */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubUserInfo> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.status}`);
  }

  const data = (await response.json()) as GitHubApiUserResponse;

  // If email is null, try to get it from emails endpoint
  let email = data.email;
  if (!email) {
    try {
      const emailResponse = await fetch(`${GITHUB_API_URL}/user/emails`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (emailResponse.ok) {
        const emails = (await emailResponse.json()) as GitHubEmailResponse[];
        // Find primary email or first verified email
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        const verifiedEmail = emails.find((e) => e.verified);
        email = primaryEmail?.email ?? verifiedEmail?.email ?? null;
      }
    } catch {
      // Ignore email fetch errors
    }
  }

  return {
    id: data.id,
    login: data.login,
    email,
    name: data.name,
    avatar_url: data.avatar_url,
  };
}

/**
 * Check if user is a collaborator of the repository
 */
export async function isRepoCollaborator(
  accessToken: string,
  owner: string,
  repo: string,
  username: string
): Promise<boolean> {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/collaborators/${username}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  // 204 = is collaborator, 404 = not collaborator
  // 403 = no permission to check (assume not collaborator)
  return response.status === 204;
}

/**
 * Check if user is a collaborator using a fallback check
 * First tries direct collaborator check, then falls back to checking if user can push
 */
export async function checkCollaboratorAccess(
  accessToken: string,
  owner: string,
  repo: string,
  username: string
): Promise<boolean> {
  // First try direct collaborator check
  const isCollaborator = await isRepoCollaborator(accessToken, owner, repo, username);
  if (isCollaborator) {
    return true;
  }

  // Fallback: Check if user has push access via repository permissions
  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      const repoData = (await response.json()) as GitHubRepoResponse;
      // Check if user has push permission
      return repoData.permissions?.push === true;
    }
  } catch {
    // Ignore errors
  }

  return false;
}
