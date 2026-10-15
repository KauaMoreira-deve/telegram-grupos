// Cache em memória com TTL curto para consultas públicas pesadas.
// Requisições simultâneas compartilham a mesma promise, evitando consultas duplicadas.
const entries = new Map();

export async function cached(key, ttlMs, loader) {
  const now = Date.now();
  const entry = entries.get(key);
  if (entry && entry.expiresAt > now) return entry.promise;

  const promise = Promise.resolve().then(loader);
  entries.set(key, { promise, expiresAt: now + ttlMs });
  try {
    return await promise;
  } catch (error) {
    // Erros não ficam em cache: a próxima requisição tenta novamente.
    if (entries.get(key)?.promise === promise) entries.delete(key);
    throw error;
  }
}

export function invalidateCache(prefix = '') {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
