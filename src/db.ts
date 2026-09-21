import type { D1Database } from '@cloudflare/workers-types';
import type { User, Repository, GitHubUser } from './types';

export async function getUserById(db: D1Database, userId: number): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();
  return result || null;
}

export async function getUserByGithubId(db: D1Database, githubId: number): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE github_id = ?')
    .bind(githubId)
    .first<User>();
  return result || null;
}

export async function createOrUpdateUser(
  db: D1Database,
  githubUser: GitHubUser,
  accessToken: string
): Promise<User> {
  const existing = await getUserByGithubId(db, githubUser.id);
  
  if (existing) {
    await db
      .prepare(
        'UPDATE users SET github_login = ?, github_name = ?, github_avatar = ?, access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .bind(
        githubUser.login,
        githubUser.name,
        githubUser.avatar_url,
        accessToken,
        existing.id
      )
      .run();
    
    return (await getUserById(db, existing.id))!;
  } else {
    const result = await db
      .prepare(
        'INSERT INTO users (github_id, github_login, github_name, github_avatar, access_token) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(
        githubUser.id,
        githubUser.login,
        githubUser.name,
        githubUser.avatar_url,
        accessToken
      )
      .run();
    
    return (await getUserById(db, result.meta.last_row_id))!;
  }
}

export async function getUserRepositories(db: D1Database, userId: number): Promise<Repository[]> {
  const result = await db
    .prepare('SELECT * FROM repositories WHERE user_id = ? ORDER BY installed_at DESC')
    .bind(userId)
    .all<Repository>();
  return result.results || [];
}

export async function addRepository(
  db: D1Database,
  userId: number,
  githubRepoId: number,
  fullName: string,
  defaultBranch: string,
  ownerLogin: string
): Promise<void> {
  await db
    .prepare(
      'INSERT OR REPLACE INTO repositories (user_id, github_repo_id, full_name, default_branch, owner_login) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(userId, githubRepoId, fullName, defaultBranch, ownerLogin)
    .run();
}

export async function removeRepository(
  db: D1Database,
  userId: number,
  githubRepoId: number
): Promise<void> {
  await db
    .prepare('DELETE FROM repositories WHERE user_id = ? AND github_repo_id = ?')
    .bind(userId, githubRepoId)
    .run();
}
