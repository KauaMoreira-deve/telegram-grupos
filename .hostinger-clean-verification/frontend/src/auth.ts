import { API_URL } from './config/api';

export type AdminSession = { id: number; nome: string; email: string; status: string; role: 'superadmin' | 'editor' };

const ADMIN_KEY = 'telegram_admin';
const TOKEN_KEY = 'telegram_admin_token';

export function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (!Number.isInteger(session.id)
      || typeof session.nome !== 'string'
      || typeof session.email !== 'string'
      || typeof session.status !== 'string'
      || !['superadmin', 'editor'].includes(session.role || '')) return null;
    return session as AdminSession;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAdminSession(admin: AdminSession, token: string) {
  if (!token) return;
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // A sessão já fica inacessível quando o armazenamento está bloqueado.
  }
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestUrl = input instanceof Request ? input.url : input.toString();
  const targetUrl = new URL(requestUrl, window.location.origin);
  const allowedOrigin = new URL(API_URL || window.location.origin, window.location.origin).origin;
  if (targetUrl.origin !== allowedOrigin) throw new Error('Destino de API não autorizado.');

  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearAdminSession();
    window.dispatchEvent(new Event('admin-session-expired'));
  }
  return response;
}
