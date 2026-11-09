import './env.js';

const localFrontendOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const configuredOrigins = (process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const MIN_AI_TIMEOUT_MS = 120_000;

function getTimeoutMs(environmentVariable: string, defaultValue: number): number {
  const configuredValue = Number(process.env[environmentVariable]);
  return Number.isFinite(configuredValue)
    ? Math.max(MIN_AI_TIMEOUT_MS, configuredValue)
    : defaultValue;
}

export const serverConfig = {
  host: process.env.HOST || 'localhost',
  port: Number(process.env.PORT || 3001),
  groqRequestTimeoutMs: getTimeoutMs('GROQ_REQUEST_TIMEOUT_MS', 600_000),
  analysisTimeoutMs: getTimeoutMs('ANALYSIS_TIMEOUT_MS', 900_000),
  allowedOrigins: new Set([...localFrontendOrigins, ...configuredOrigins]),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
};
