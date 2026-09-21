import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

try {
  loadEnvFile(path.join(backendDirectory, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`A variável de ambiente ${name} não foi configurada.`);
  return value;
}

function integer(name, { defaultValue, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue && defaultValue !== undefined) return defaultValue;

  const value = Number(rawValue || required(name));
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`A variável de ambiente ${name} precisa ser um inteiro entre ${min} e ${max}.`);
  }
  return value;
}

function boolean(name, defaultValue = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  if (['true', '1', 'yes', 'sim'].includes(value)) return true;
  if (['false', '0', 'no', 'nao', 'não'].includes(value)) return false;
  throw new Error(`A variável de ambiente ${name} precisa ser true ou false.`);
}

function corsOrigins(nodeEnv) {
  const origins = required('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (!origins.length) throw new Error('Configure pelo menos uma origem em CORS_ORIGIN.');
  if (nodeEnv === 'production' && origins.includes('*')) {
    throw new Error('CORS_ORIGIN não pode conter * em produção.');
  }

  for (const origin of origins) {
    if (origin === '*' && nodeEnv !== 'production') continue;
    let url;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`Origem inválida em CORS_ORIGIN: ${origin}`);
    }

    if (!['http:', 'https:'].includes(url.protocol)
      || url.origin !== origin
      || url.username
      || url.password
      || url.pathname !== '/') {
      throw new Error(`CORS_ORIGIN deve conter apenas origens HTTP(S), sem caminhos: ${origin}`);
    }
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
      throw new Error(`Use somente HTTPS em CORS_ORIGIN no ambiente de produção: ${origin}`);
    }
  }

  return [...new Set(origins)];
}

function trustProxy(nodeEnv) {
  const value = process.env.TRUST_PROXY?.trim() || (nodeEnv === 'production' ? '1' : 'false');
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (hops >= 1 && hops <= 10) return hops;
  }
  if (['loopback', 'linklocal', 'uniquelocal'].includes(value)) return value;
  throw new Error('TRUST_PROXY deve ser false, um número de saltos entre 1 e 10 ou uma faixa predefinida segura.');
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV deve ser development, test ou production.');
}

const authSecret = required('AUTH_SECRET');
if (nodeEnv === 'production' && Buffer.byteLength(authSecret, 'utf8') < 32) {
  throw new Error('AUTH_SECRET precisa ter pelo menos 32 bytes aleatórios em produção.');
}

const databasePassword = process.env.DB_PASSWORD ?? '';
if (nodeEnv === 'production' && !databasePassword) {
  throw new Error('DB_PASSWORD não pode ficar vazio em produção.');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  host: process.env.HOST?.trim() || '0.0.0.0',
  port: integer('PORT', { defaultValue: 3000, max: 65_535 }),
  trustProxy: trustProxy(nodeEnv),
  corsOrigins: corsOrigins(nodeEnv),
  runMigrations: boolean('RUN_MIGRATIONS', true),
  database: Object.freeze({
    host: required('DB_HOST'),
    port: integer('DB_PORT', { defaultValue: 3306, max: 65_535 }),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: databasePassword,
    connectionLimit: integer('DB_CONNECTION_LIMIT', { defaultValue: 10, max: 100 }),
    ssl: boolean('DB_SSL', false),
    sslRejectUnauthorized: boolean('DB_SSL_REJECT_UNAUTHORIZED', true),
    sslCa: process.env.DB_SSL_CA?.replace(/\\n/g, '\n').trim() || undefined,
  }),
  auth: Object.freeze({
    secret: authSecret,
    tokenTtlMs: integer('AUTH_TOKEN_TTL_MS', {
      defaultValue: 28_800_000,
      min: 300_000,
      max: 86_400_000,
    }),
  }),
  telegram: Object.freeze({
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || '',
  }),
});
