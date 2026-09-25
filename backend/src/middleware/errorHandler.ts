import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: env.NODE_ENV === 'production' ? 'Internal server error' : error.message || 'Internal server error' });
};
