const TELEGRAM_HOSTS = new Set(['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me']);

export const normalize = (value) => String(value ?? '').trim();

export function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPassword(value, { required = true } = {}) {
  if (!value && !required) return true;
  return value.length >= 8
    && value.length <= 72
    && Buffer.byteLength(value, 'utf8') <= 72;
}

export function isValidTelegramUrl(value) {
  if (!value || value.length > 255) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && TELEGRAM_HOSTS.has(url.hostname.toLowerCase())
      && !url.username
      && !url.password
      && !url.port
      && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function isValidSlug(value, maxLength) {
  return value.length <= maxLength && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

