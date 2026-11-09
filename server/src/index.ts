import app from './app.js';
import type { Server } from 'node:http';
import { serverConfig } from './config/server.js';
import { initializeDatabase } from './services/report.service.js';
import { logger } from './utils/logger.js';

async function start() {
  await initializeDatabase();

  const server: Server = app.listen(serverConfig.port, serverConfig.host, () => {
    logger.info('server.started', {
      host: serverConfig.host,
      port: serverConfig.port,
      requestTimeoutMs: serverConfig.analysisTimeoutMs,
      socketTimeoutMs: server.timeout,
      allowedOrigins: Array.from(serverConfig.allowedOrigins),
      rateLimitWindowMs: serverConfig.rateLimitWindowMs,
      rateLimitMax: serverConfig.rateLimitMax,
    });
  });
  server.requestTimeout = Math.max(serverConfig.analysisTimeoutMs, 120_000);
  server.timeout = 0;
}

start().catch((err) => {
  logger.error('server.start_failed', { error: err });
  process.exit(1);
});
