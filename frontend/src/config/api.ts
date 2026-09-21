const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() || '';

function resolveApiUrl() {
  if (!configuredApiUrl || configuredApiUrl === '/') return '';

  try {
    const parsedUrl = new URL(configuredApiUrl);
    const isLocalAddress = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname);

    // Um .env local nunca deve fazer o site publicado tentar acessar a máquina do visitante.
    if (import.meta.env.PROD && (isLocalAddress || parsedUrl.protocol !== 'https:')) return '';
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return '';
    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export const API_URL = resolveApiUrl();

export function apiUrl(path: string) {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
