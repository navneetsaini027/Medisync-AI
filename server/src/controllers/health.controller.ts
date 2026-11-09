import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export function getHealth(req: Request, res: Response) {
  logger.debug('health.checked', { requestId: req.requestId });
  res.json({ status: 'ok', message: 'Server is running' });
}
