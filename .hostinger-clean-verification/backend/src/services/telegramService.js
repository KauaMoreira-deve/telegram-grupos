import { env } from '../config/env.js';

const TELEGRAM_HOSTS = new Set(['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me']);

function getPublicTelegramUrl(link) {
  let url;

  try {
    url = new URL(link);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol) || !TELEGRAM_HOSTS.has(url.hostname.toLowerCase())) return null;

  // Links de convite privados não expõem a quantidade de membros na página pública.
  if (!url.pathname || url.pathname === '/' || url.pathname.startsWith('/+')) return null;

  return url.toString();
}

function getTelegramUsername(link) {
  const publicUrl = getPublicTelegramUrl(link);
  if (!publicUrl) return null;
  const [username] = new URL(publicUrl).pathname.split('/').filter(Boolean);
  if (!username || ['joinchat', 's'].includes(username.toLowerCase())) return null;
  return username;
}

async function fetchBotMemberCount(username) {
  if (!env.telegram.botToken || !username) return null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.telegram.botToken}/getChatMemberCount?chat_id=${encodeURIComponent(`@${username}`)}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.ok && Number.isSafeInteger(data.result) ? data.result : null;
  } catch {
    return null;
  }
}

async function fetchTelegramPage(value) {
  let currentUrl = new URL(value);

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (currentUrl.protocol !== 'https:' || !TELEGRAM_HOSTS.has(currentUrl.hostname.toLowerCase())) {
      throw new Error('O Telegram retornou um redirecionamento não permitido.');
    }

    let response;
    try {
      response = await fetch(currentUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; PutariaNoTelegram/1.0)',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new Error('Não foi possível consultar o Telegram.');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) {
        throw new Error('O Telegram retornou redirecionamentos demais.');
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return response;
  }

  throw new Error('Não foi possível consultar o Telegram.');
}

function textFromHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLocalizedNumber(rawValue) {
  const value = rawValue.toLowerCase().replace(/\s/g, '');
  const compactMatch = value.match(/^([\d.,]+)(k|m|mil|mi)$/i);

  if (compactMatch) {
    const numericValue = Number(compactMatch[1].replace(',', '.'));
    if (!Number.isFinite(numericValue)) return null;
    return Math.round(numericValue * (/^(m|mi)$/i.test(compactMatch[2]) ? 1_000_000 : 1_000));
  }

  const numericValue = Number(value.replace(/[.,]/g, ''));
  return Number.isSafeInteger(numericValue) ? numericValue : null;
}

export function extractTelegramMemberCount(html) {
  const pageExtra = html.match(/class=["'][^"']*tgme_page_extra[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
  const metaDescription = html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const sources = [pageExtra, metaDescription, html].filter(Boolean).map(textFromHtml);

  for (const source of sources) {
    const match = source.match(/([\d][\d\s.,]*(?:\s*(?:k|m|mil|mi))?)\s+(?:members|subscribers|membros|inscritos|participantes)\b/i);
    if (match) return parseLocalizedNumber(match[1]);
  }

  return null;
}

export async function fetchTelegramMemberCount(link) {
  const publicUrl = getPublicTelegramUrl(link);
  if (!publicUrl) return null;

  const username = getTelegramUsername(publicUrl);
  const botCount = await fetchBotMemberCount(username);
  if (botCount !== null) return botCount;

  const urls = [publicUrl];
  if (username) urls.push(`https://t.me/${username}?embed=1&mode=tme`);
  const results = await Promise.allSettled(urls.map(async (url) => {
      const response = await fetchTelegramPage(url);
      if (!response.ok) throw new Error(`O Telegram respondeu com o status ${response.status}.`);
      const html = await response.text();
      return extractTelegramMemberCount(html.slice(0, 1_000_000));
  }));

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) return result.value;
  }

  const failedRequest = results.find((result) => result.status === 'rejected');
  if (failedRequest?.status === 'rejected') throw failedRequest.reason;
  return null;
}
