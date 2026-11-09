import '../config/env.js';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
const minimumLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

function redact(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (/token|secret|password|private|credential|apikey|api_key|authorization|data/i.test(key)) {
        return [key, '[redacted]'];
      }

      return [key, redact(item)];
    })
  );
}

function write(level: LogLevel, message: string, meta: LogMeta = {}) {
  if (LOG_LEVELS[level] < minimumLevel) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta) as LogMeta,
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  req.requestId = req.header('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);

  logger.info('request.started', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.on('finish', () => {
    logger.info('request.completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}
