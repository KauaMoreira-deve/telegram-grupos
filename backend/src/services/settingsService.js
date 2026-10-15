import conexao from '../config/database.js';
import { cached, invalidateCache } from '../utils/cache.js';

const POPUNDER_KEY = 'popunder';
const POPUNDER_MODES = new Set(['sequencial', 'aleatorio']);
const MAX_POPUNDER_LINKS = 20;

// Valor usado enquanto nada foi salvo no painel (mantém o comportamento anterior do site).
export const DEFAULT_POPUNDER = Object.freeze({
  enabled: true,
  mode: 'sequencial',
  links: ['https://t.me/addlist/O1xBNBhDJto2ODYx'],
});

function isValidPopunderUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Valida e normaliza a configuração do pop under.
 * Retorna null quando algum campo é inválido.
 */
export function normalizePopunderSettings(body) {
  const rawLinks = Array.isArray(body?.links)
    ? body.links
    : String(body?.links ?? '').split(/\r?\n/);
  const links = [...new Set(rawLinks.map((link) => String(link ?? '').trim()).filter(Boolean))];
  const mode = String(body?.mode ?? 'sequencial').trim().toLowerCase();
  const enabled = body?.enabled === true || body?.enabled === 'true' || body?.enabled === 1;

  if (links.length > MAX_POPUNDER_LINKS || !links.every(isValidPopunderUrl) || !POPUNDER_MODES.has(mode)) {
    return null;
  }
  if (enabled && links.length === 0) return null;
  return { enabled, mode, links };
}

export function getPopunderSettings() {
  return cached('settings:popunder', 30_000, async () => {
    const [[row]] = await conexao.query(
      'SELECT valor_configuracao AS value FROM tbl_configuracao WHERE chave_configuracao = ?',
      [POPUNDER_KEY],
    );
    if (!row) return DEFAULT_POPUNDER;
    try {
      return normalizePopunderSettings(JSON.parse(row.value)) || DEFAULT_POPUNDER;
    } catch {
      return DEFAULT_POPUNDER;
    }
  });
}

export async function savePopunderSettings(settings) {
  await conexao.query(
    `INSERT INTO tbl_configuracao (chave_configuracao, valor_configuracao) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE valor_configuracao = VALUES(valor_configuracao)`,
    [POPUNDER_KEY, JSON.stringify(settings)],
  );
  invalidateCache('settings:');
}
