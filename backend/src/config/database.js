import mysql from 'mysql2/promise';
import { env } from './env.js';

const conexao = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
  waitForConnections: true,
  connectionLimit: env.database.connectionLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  charset: 'utf8mb4',
  ...(env.database.ssl
    ? {
      ssl: {
        rejectUnauthorized: env.database.sslRejectUnauthorized,
        ...(env.database.sslCa ? { ca: env.database.sslCa } : {}),
      },
    }
    : {}),
});

export default conexao;
