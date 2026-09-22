import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import conexao, { testConnection } from './src/config/database.js';
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
let encerrando = false;

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

  startPromise = (async () => {
    // 1. Testa a conexão com o banco antes de aceitar requisições.
    await testConnection();

    // 2. Executa migrations, se configurado.
    if (env.runMigrations) await runMigrations();

    // 3. Inicia o servidor HTTP somente após o banco estar disponível.
    const httpServer = await new Promise((resolve, reject) => {
      const s = app.listen(env.port, env.host);
      server = s;

      s.requestTimeout = 15_000;
      s.headersTimeout = 10_000;
      s.keepAliveTimeout = 5_000;
      s.maxRequestsPerSocket = 1_000;

      function handleStartupError(error) {
        s.off('listening', handleListening);
        reject(error);
      }

      function handleListening() {
        s.off('error', handleStartupError);
        resolve(s);
      }

      s.once('error', handleStartupError);
      s.once('listening', handleListening);
    });

    console.log(`Servidor iniciado na porta ${env.port} (${env.nodeEnv}).`);
    return httpServer;
  })().catch(async (error) => {
    try {
      await closeServer(server);
    } catch (closeError) {
      console.error('Não foi possível encerrar o servidor após a falha de inicialização.', {
        message: closeError.message,
        code: closeError.code,
      });
    }
    try {
      if (!encerrando) {
        encerrando = true;
        await conexao.end();
      }
    } catch (databaseError) {
      console.error('Não foi possível encerrar o banco após a falha de inicialização.', {
        message: databaseError.message,
        code: databaseError.code,
      });
    }
    throw error;
  });

  return startPromise;
}

async function shutdown(signal) {
  if (encerrando) return;
  encerrando = true;

  console.log(`Encerrando o servidor (${signal}).`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  try {
    if (server) await closeServer(server);
  } catch (error) {
    console.error('Erro ao fechar servidor HTTP:', error.message);
  }

  try {
    await conexao.end();
  } catch (error) {
    console.error('Erro ao fechar conexão com banco:', error.message);
  }

  process.exit(0);
}

if (env.nodeEnv !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  void startServer().catch((error) => {
    console.error('Não foi possível iniciar o servidor:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: error.stack,
    });
    process.exitCode = 1;
  });
}

export { app };
