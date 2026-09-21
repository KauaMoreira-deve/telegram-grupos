import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDirectory = path.resolve(projectDirectory, '../frontend/dist');
const frontendIndexFile = path.join(frontendDistDirectory, 'index.html');

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

app.use('/api', notFoundHandler);

if (env.isProduction) {
  app.use(express.static(frontendDistDirectory, { index: false }));
  app.get('/{*frontendPath}', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(frontendIndexFile, (error) => {
      if (error) next(error);
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

let server;
let startPromise;

function closeServer(httpServer) {
  if (!httpServer?.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function startServer() {
  if (startPromise) return startPromise;

  startPromise = new Promise((resolve, reject) => {
    const httpServer = app.listen(env.port, env.host);
    server = httpServer;

    httpServer.requestTimeout = 15_000;
    httpServer.headersTimeout = 10_000;
    httpServer.keepAliveTimeout = 5_000;
    httpServer.maxRequestsPerSocket = 1_000;

    function handleStartupError(error) {
      httpServer.off('listening', handleListening);
      reject(error);
    }

    function handleListening() {
      httpServer.off('error', handleStartupError);
      console.log(`Servidor iniciado na porta ${env.port} (${env.nodeEnv}).`);
      resolve(httpServer);
    }

    httpServer.once('error', handleStartupError);
    httpServer.once('listening', handleListening);
  }).then(async (httpServer) => {
    if (env.runMigrations) await runMigrations();
    return httpServer;
  }).catch(async (error) => {
    try {
      await closeServer(server);
    } catch (closeError) {
      console.error('Não foi possível encerrar o servidor após a falha de inicialização.', {
        code: closeError.code,
        name: closeError.name,
      });
    }
    try {
      await conexao.end();
    } catch (databaseError) {
      console.error('Não foi possível encerrar o banco após a falha de inicialização.', {
        code: databaseError.code,
        name: databaseError.name,
      });
    }
    throw error;
  });

  return startPromise;
}

async function shutdown(signal) {
  console.log(`Encerrando o servidor (${signal}).`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  if (server) await closeServer(server);
  await conexao.end();
  process.exit(0);
}

if (env.nodeEnv !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  void startServer().catch((error) => {
    console.error('Não foi possível iniciar o servidor.', {
      code: error.code,
      name: error.name,
    });
    process.exitCode = 1;
  });
}

export { app };
