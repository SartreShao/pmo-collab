export interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  APP_BASE_URL: string;
}

export interface User {
  id: number;
  github_id: number;
  github_login: string;
  github_name: string | null;
  github_avatar: string | null;
  access_token: string;
}

export interface Repository {
  id: number;
  user_id: number;
  github_repo_id: number;
  full_name: string;
  default_branch: string | null;
  owner_login: string;
  installed_at: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  default_branch: string;
  owner: {
    login: string;
  };
}
