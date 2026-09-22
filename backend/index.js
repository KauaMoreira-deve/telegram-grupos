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

// ── Estado de prontidão ──────────────────────────────────────────────
// O servidor começa a escutar imediatamente (requisito Hostinger: < 3 s),
// mas endpoints que dependem do banco ficam bloqueados até que as migrations
// terminem e a conexão esteja validada.
let ready = false;
let startupError = null;

function readinessGate(_req, res, next) {
  if (ready) return next();
  if (startupError) {
    return res.status(503).json({
      status: 'error',
      message: 'Servidor ainda não está pronto. Inicialização falhou.',
    });
  }
  return res.status(503).json({
    status: 'starting',
    message: 'Servidor ainda está iniciando. Tente novamente em alguns segundos.',
  });
}

// ── Middlewares globais ──────────────────────────────────────────────
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

// ── Health check (sempre disponível, inclusive durante startup) ──────
app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: ready ? 'ok' : 'starting' });
});

// ── Rate limiter + body parser ──────────────────────────────────────
app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
}));
app.use(express.json({ limit: '64kb', strict: true }));

// ── Gate de prontidão: bloqueia rotas do banco até migrations terminarem ─
app.use('/api', readinessGate);

// ── Rotas ───────────────────────────────────────────────────────────
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

// ── Ciclo de vida ───────────────────────────────────────────────────
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
    // 1. Inicia o servidor HTTP IMEDIATAMENTE para satisfazer o requisito
    //    de tempo da Hostinger (app.listen() em menos de 3 segundos).
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

    // 2. Testa a conexão com o banco.
    const connection = await conexao.getConnection();
    connection.release();
    console.log('Conexão com o banco de dados validada.');

    // 3. Executa migrations pendentes, se configurado.
    if (env.runMigrations) {
      const executed = await runMigrations();
      if (executed.length > 0) {
        console.log(`Migrations executadas: ${executed.join(', ')}`);
      } else {
        console.log('Banco de dados já está atualizado.');
      }
    }

    // 4. Libera os endpoints para uso.
    ready = true;
    console.log('Servidor pronto para receber requisições.');

    return httpServer;
  })().catch(async (error) => {
    startupError = error;
    console.error('Falha durante a inicialização:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: error.stack,
    });
    // Não derruba o processo — o servidor continua respondendo 503
    // para que a Hostinger não fique reiniciando infinitamente.
    // O health check retorna { status: 'starting' } para monitoramento.
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
  void startServer();
}

export { app };
