import { Hono } from 'hono';
import type { Env } from './types';
import { getSession, setSession, clearSession } from './session';
import { getUserById, createOrUpdateUser, getUserRepositories, addRepository, removeRepository } from './db';
import { getGitHubUser, getGitHubRepos, exchangeCodeForToken } from './github';

const app = new Hono<{ Bindings: Env }>();

// 首页
app.get('/', async (c) => {
  const userId = await getSession(c);
  
  if (userId) {
    return c.redirect('/repos');
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PMO Collab - 人机协同项目管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      font-weight: 600;
      color: #ffffff;
    }
    .tagline {
      font-size: 1.1rem;
      color: #999;
      margin-bottom: 3rem;
    }
    .login-btn {
      display: inline-block;
      background: #ffffff;
      color: #0a0a0a;
      padding: 0.875rem 2rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      font-size: 1rem;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }
    .login-btn:hover {
      background: #e0e0e0;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PMO Collab</h1>
    <p class="tagline">人机协同项目管理系统</p>
    <a href="/auth/login" class="login-btn">使用 GitHub 登录</a>
  </div>
</body>
</html>`);
});

// 登录跳转
app.get('/auth/login', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = `${c.env.APP_BASE_URL}/auth/callback`;
  const scope = 'read:user repo';
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  
  return c.redirect(authUrl);
});

// OAuth 回调
app.get('/auth/callback', async (c) => {
  const code = c.req.query('code');
  
  if (!code) {
    return c.text('Missing authorization code', 400);
  }
  
  try {
    const redirectUri = `${c.env.APP_BASE_URL}/auth/callback`;
    const accessToken = await exchangeCodeForToken(
      code,
      c.env.GITHUB_CLIENT_ID,
      c.env.GITHUB_CLIENT_SECRET,
      redirectUri
    );
    
    const githubUser = await getGitHubUser(accessToken);
    const user = await createOrUpdateUser(c.env.DB, githubUser, accessToken);
    
    await setSession(c, user.id);
    
    return c.redirect('/repos');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.text('Authentication failed', 500);
  }
});

// 登出
app.get('/auth/logout', (c) => {
  clearSession(c);
  return c.redirect('/');
});

// 仓库管理页面
app.get('/repos', async (c) => {
  const userId = await getSession(c);
  
  if (!userId) {
    return c.redirect('/');
  }
  
  const user = await getUserById(c.env.DB, userId);
  if (!user) {
    return c.redirect('/');
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>仓库管理 - PMO Collab</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .header {
      background: #111;
      border-bottom: 1px solid #222;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }
    .logout-btn {
      color: #999;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .logout-btn:hover { color: #fff; }
    .container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 2rem;
    }
    .section {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      font-weight: 600;
    }
    .repo-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .repo-item {
      background: #0a0a0a;
      border: 1px solid #222;
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .repo-name {
      font-weight: 500;
      color: #fff;
    }
    .repo-info {
      font-size: 0.85rem;
      color: #666;
      margin-top: 0.25rem;
    }
    .btn {
      background: #fff;
      color: #0a0a0a;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #e0e0e0;
    }
    .btn-danger {
      background: #dc2626;
      color: #fff;
    }
    .btn-danger:hover {
      background: #b91c1c;
    }
    .empty {
      color: #666;
      text-align: center;
      padding: 2rem;
    }
    .loading {
      text-align: center;
      padding: 2rem;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PMO Collab</h1>
    <div class="user-info">
      <img class="user-avatar" src="${user.github_avatar || ''}" alt="${user.github_login}">
      <span>${user.github_name || user.github_login}</span>
      <a href="/auth/logout" class="logout-btn">退出</a>
    </div>
  </div>
  
  <div class="container">
    <div class="section">
      <h2>已接入的仓库</h2>
      <div id="managed-repos" class="repo-list">
        <div class="loading">加载中...</div>
      </div>
    </div>
    
    <div class="section">
      <h2>可用仓库</h2>
      <div id="available-repos" class="repo-list">
        <div class="loading">加载中...</div>
      </div>
    </div>
  </div>
  
  <script>
    async function loadRepos() {
      try {
        const [managed, available] = await Promise.all([
          fetch('/api/repos/managed').then(r => r.json()),
          fetch('/api/repos/available').then(r => r.json())
        ]);
        
        const managedIds = new Set(managed.map(r => r.github_repo_id));
        
        const managedEl = document.getElementById('managed-repos');
        if (managed.length === 0) {
          managedEl.innerHTML = '<div class="empty">暂无接入的仓库</div>';
        } else {
          managedEl.innerHTML = managed.map(repo => \`
            <div class="repo-item">
              <div>
                <div class="repo-name">\${repo.full_name}</div>
                <div class="repo-info">默认分支：\${repo.default_branch || 'N/A'}</div>
              </div>
              <button class="btn btn-danger" onclick="removeRepo(\${repo.github_repo_id})">移除</button>
            </div>
          \`).join('');
        }
        
        const availableRepos = available.filter(r => !managedIds.has(r.id));
        const availableEl = document.getElementById('available-repos');
        if (availableRepos.length === 0) {
          availableEl.innerHTML = '<div class="empty">所有仓库已接入</div>';
        } else {
          availableEl.innerHTML = availableRepos.map(repo => \`
            <div class="repo-item">
              <div>
                <div class="repo-name">\${repo.full_name}</div>
                <div class="repo-info">默认分支：\${repo.default_branch || 'N/A'}</div>
              </div>
              <button class="btn" onclick="addRepo(\${repo.id}, '\${repo.full_name}', '\${repo.default_branch}', '\${repo.owner.login}')">接入</button>
            </div>
          \`).join('');
        }
      } catch (error) {
        console.error('Failed to load repos:', error);
      }
    }
    
    async function addRepo(id, fullName, defaultBranch, ownerLogin) {
      try {
        await fetch('/api/repos/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, full_name: fullName, default_branch: defaultBranch, owner_login: ownerLogin })
        });
        await loadRepos();
      } catch (error) {
        alert('添加仓库失败');
      }
    }
    
    async function removeRepo(id) {
      if (!confirm('确定要移除此仓库吗？')) return;
      try {
        await fetch('/api/repos/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        await loadRepos();
      } catch (error) {
        alert('移除仓库失败');
      }
    }
    
    loadRepos();
  </script>
</body>
</html>`);
});

// API: 获取已接入的仓库
app.get('/api/repos/managed', async (c) => {
  const userId = await getSession(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const repos = await getUserRepositories(c.env.DB, userId);
  return c.json(repos);
});

// API: 获取可用的 GitHub 仓库
app.get('/api/repos/available', async (c) => {
  const userId = await getSession(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const user = await getUserById(c.env.DB, userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  try {
    const repos = await getGitHubRepos(user.access_token);
    return c.json(repos);
  } catch (error) {
    console.error('Failed to fetch GitHub repos:', error);
    return c.json({ error: 'Failed to fetch repositories' }, 500);
  }
});

// API: 添加仓库
app.post('/api/repos/add', async (c) => {
  const userId = await getSession(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const body = await c.req.json();
  const { id, full_name, default_branch, owner_login } = body;
  
  if (!id || !full_name || !owner_login) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  
  try {
    await addRepository(c.env.DB, userId, id, full_name, default_branch, owner_login);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to add repository:', error);
    return c.json({ error: 'Failed to add repository' }, 500);
  }
});

// API: 移除仓库
app.post('/api/repos/remove', async (c) => {
  const userId = await getSession(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const body = await c.req.json();
  const { id } = body;
  
  if (!id) {
    return c.json({ error: 'Missing repository id' }, 400);
  }
  
  try {
    await removeRepository(c.env.DB, userId, id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to remove repository:', error);
    return c.json({ error: 'Failed to remove repository' }, 500);
  }
});

export default app;
