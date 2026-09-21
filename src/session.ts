import type { Context } from 'hono';
import type { Env } from './types';

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 天

// 简单的 session 加密（仅用于演示，生产环境建议使用更安全的方案）
async function encrypt(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encrypted: string, secret: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return decoder.decode(decrypted);
  } catch {
    return null;
  }
}

export async function setSession(c: Context<{ Bindings: Env }>, userId: number) {
  const sessionData = JSON.stringify({ userId, timestamp: Date.now() });
  const encrypted = await encrypt(sessionData, c.env.SESSION_SECRET);
  
  c.header(
    'Set-Cookie',
    `${COOKIE_NAME}=${encrypted}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`
  );
}

export async function getSession(c: Context<{ Bindings: Env }>): Promise<number | null> {
  const cookie = c.req.header('Cookie');
  if (!cookie) return null;
  
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  
  const decrypted = await decrypt(match[1], c.env.SESSION_SECRET);
  if (!decrypted) return null;
  
  try {
    const data = JSON.parse(decrypted);
    return data.userId;
  } catch {
    return null;
  }
}

export function clearSession(c: Context<{ Bindings: Env }>) {
  c.header(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}
