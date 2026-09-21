import crypto from 'node:crypto';
import { env } from '../config/env.js';

const MAX_RATE_LIMIT_KEYS = 50_000;
const API_CONTENT_SECURITY_POLICY = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const FRONTEND_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join('; ');

function clientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function securityHeaders(req, res, next) {
  const isApiRequest = req.path === '/api' || req.path.startsWith('/api/');
  res.setHeader(
    'Content-Security-Policy',
    isApiRequest ? API_CONTENT_SECURITY_POLICY : FRONTEND_CONTENT_SECURITY_POLICY,
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  if (env.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.locals.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', res.locals.requestId);
  next();
}

export function noStore(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}

export function createRateLimiter({ windowMs, max, message }) {
  const clients = new Map();
  let lastCleanup = 0;

  return (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    const now = Date.now();
    if (now - lastCleanup >= windowMs || clients.size >= MAX_RATE_LIMIT_KEYS) {
      for (const [key, entry] of clients) {
        if (entry.resetAt <= now) clients.delete(key);
      }
      while (clients.size >= MAX_RATE_LIMIT_KEYS) {
        clients.delete(clients.keys().next().value);
      }
      lastCleanup = now;
    }

    const key = clientKey(req);
    let entry = clients.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('RateLimit-Policy', `${max};w=${Math.ceil(windowMs / 1000)}`);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({ erro: message || 'Muitas requisições. Tente novamente mais tarde.' });
    }

    return next();
  };
}

export function validateNumericId(req, res, next, value) {
  if (!/^[1-9]\d{0,18}$/.test(value)) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  return next();
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

export function errorHandler(error, req, res, next) {
  const requestId = res.locals.requestId;
  const isInvalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const status = isInvalidJson ? 400 : Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;

  if (status >= 500) {
    console.error('Erro interno na requisição.', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      code: error.code,
      name: error.name,
    });
  }

  if (res.headersSent) return next(error);
  res.status(status).json({
    erro: isInvalidJson
      ? 'O corpo da requisição contém JSON inválido.'
      : status === 500
        ? 'Erro interno do servidor.'
        : error.message || 'Requisição inválida.',
    requestId,
  });
}
