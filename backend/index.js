import { pathToFileURL } from 'node:url';
import cors from 'cors';
import express from 'express';
import conexao from './src/config/database.js';
import { env } from './src/config/env.js';
import { runMigrations } from './src/config/migrations.js';
import {
  createRateLimiter,
  errorHandler,
  notFoundHandler,
  securityHeaders,
} from './src/middlewares/securityMiddleware.js';
import adminRoutes from './src/routes/adminRoutes.js';
import loginRoutes from './src/routes/loginRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';

const app = express();
const allowedOrigins = new Set(env.corsOrigins);

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has('*') || allowedOrigins.has(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    const error = new Error('Origem não permitida.');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86_400,
  optionsSuccessStatus: 204,
}));

app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
}));
app.use(express.json({ limit: '64kb', strict: true }));

app.use('/api', loginRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

let server;

export async function startServer() {
  if (env.runMigrations) await runMigrations();

  server = app.listen(env.port, env.host, () => {
    console.log(`Servidor iniciado na porta ${env.port} (${env.nodeEnv}).`);
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 1_000;
  return server;
}

async function shutdown(signal) {
  console.log(`Encerrando o servidor (${signal}).`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await conexao.end();
  process.exit(0);
}

const isMainModule = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMainModule) {
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  startServer().catch((error) => {
    console.error('Não foi possível iniciar o servidor.', {
      code: error.code,
      name: error.name,
    });
    process.exitCode = 1;
  });
}

export { app };
