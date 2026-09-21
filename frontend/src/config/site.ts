export const SITE_NAME = 'Putaria no Telegram';
export const SITE_URL = 'https://putarianotelegram.net';
export const SITE_DESCRIPTION = 'Encontre grupos adultos e canais +18 no Telegram com links ativos, categorias variadas e acesso gratuito. Conteúdo exclusivo para maiores de 18 anos.';
export const HOME_TITLE = 'Grupos adultos no Telegram (+18): links ativos';

export function siteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(SITE_URL);
  // Atribuir como pathname impede que caminhos iniciados por // troquem o domínio canônico.
  url.pathname = normalizedPath;
  return url.toString();
}

export function safeTelegramUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !['t.me', 'telegram.me'].includes(hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
