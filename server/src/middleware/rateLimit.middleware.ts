import type { NextFunction, Request, Response } from 'express';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function reportRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip || req.header('x-forwarded-for') || 'unknown';
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + serverConfig.rateLimitWindowMs });
    return next();
  }

  if (current.count >= serverConfig.rateLimitMax) {
    logger.warn('rate_limit.exceeded', {
      requestId: req.requestId,
      key,
      path: req.path,
      count: current.count,
      limit: serverConfig.rateLimitMax,
    });
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  }

  current.count += 1;
  return next();
}
