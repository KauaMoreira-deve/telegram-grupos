import crypto from 'crypto';
import conexao from '../config/database.js';
import { env } from '../config/env.js';

const TOKEN_TTL_MS = env.auth.tokenTtlMs;
const tokenSecret = env.auth.secret;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(payload) {
  return crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
}

export function createAccessToken(userId) {
  const now = Date.now();
  const payload = encode({
    v: 1,
    iss: 'putarianotelegram.net',
    sub: userId,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  });
  return `${payload}.${sign(payload)}`;
}

export async function requireAuth(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const tokenParts = token.length <= 2_048 ? token.split('.') : [];
  const [payload, signature] = tokenParts;

  if (tokenParts.length !== 2
    || !/^[A-Za-z0-9_-]+$/.test(payload || '')
    || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) {
    return res.status(401).json({ erro: 'Autenticação necessária.' });
  }

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature, 'ascii');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'ascii');
  const isValidSignature = signatureBuffer.length === expectedSignatureBuffer.length
    && crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

  if (!isValidSignature) return res.status(401).json({ erro: 'Sessão inválida.' });

  try {
    const data = decode(payload);
    const now = Date.now();
    if (!data
      || data.v !== 1
      || data.iss !== 'putarianotelegram.net'
      || !Number.isSafeInteger(data.sub)
      || data.sub <= 0
      || !Number.isFinite(data.iat)
      || data.iat > now + 30_000
      || !Number.isFinite(data.exp)
      || data.exp <= now
      || data.exp - data.iat > TOKEN_TTL_MS) {
      return res.status(401).json({ erro: 'Sua sessão expirou. Entre novamente.' });
    }

    const [users] = await conexao.query(
      `SELECT id_usuario AS id, nome_usuario AS nome, email_usuario AS email,
        status_usuario AS status, papel_usuario AS role
       FROM tbl_usuario
       WHERE id_usuario = ? AND status_usuario = 'ativo'`,
      [data.sub],
    );

    if (!users.length) return res.status(401).json({ erro: 'Sua sessão não é mais válida.' });
    req.admin = users[0];
    next();
  } catch (error) {
    console.error('Erro ao validar autenticação.', { code: error.code, name: error.name });
    return res.status(401).json({ erro: 'Sessão inválida.' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ erro: 'Permissão de superadministrador necessária.' });
  }
  return next();
}
