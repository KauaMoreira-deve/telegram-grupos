export const SITE_NAME = 'Putaria no Telegram';
export const SITE_URL = 'https://putarianotelegram.net';
// Título, descrição e imagem mantidos em sincronia com backend/src/services/seoRenderer.js.
export const SITE_DESCRIPTION = 'Grupos de putaria e canais adultos no Telegram (+18) com links ativos e verificação automática. Amadoras, casais, gays e mais: grátis e sem cadastro.';
export const HOME_TITLE = 'Grupos de Putaria no Telegram +18: links ativos e verificados';
// Cópia estável de src/assets/imagem-grupos.webp em public/, usada no compartilhamento.
export const DEFAULT_SHARE_IMAGE = { path: '/og-image.webp', width: 800, height: 450, alt: 'Grupos de putaria no Telegram +18' };

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
