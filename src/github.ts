import type { GitHubUser, GitHubRepo } from './types';

const GITHUB_API_BASE = 'https://api.github.com';

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }
  
  return await response.json();
}

export async function getGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  
  while (true) {
    const response = await fetch(
      `${GITHUB_API_BASE}/user/repos?per_page=100&page=${page}&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch GitHub repos');
    }
    
    const pageRepos = (await response.json()) as GitHubRepo[];
    if (pageRepos.length === 0) break;
    
    repos.push(...pageRepos);
    page++;
    
    // 限制最多获取 500 个仓库
    if (page > 5) break;
  }
  
  return repos;
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }
  
  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  return data.access_token!;
}
