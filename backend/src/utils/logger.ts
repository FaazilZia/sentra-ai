import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    // Safe serializer to prevent circular JSON crashes in dev
    const safeStringify = (obj: any) => {
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
        }
        return value;
      }, 2);
    };

    const metaStr = Object.keys(meta).length ? `\n${safeStringify(meta)}` : '';
    return `${timestamp} ${level}: ${stack || message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'sentra-backend' },
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

export const logRequest = (data: {
  requestId: string;
  orgId: string;
  endpoint: string;
  status: number;
  latency: number;
  message?: string;
  error?: any;
}) => {
  const isError = data.status >= 400;
  const isSlow = data.latency > 1000;

  if (isError || isSlow || data.message) {
    const level = isError ? 'error' : 'info';
    logger.log(level, data.message || (isError ? 'Request processed' : 'Slow request detected'), {
      requestId: data.requestId,
      orgId: data.orgId,
      endpoint: data.endpoint,
      status: data.status,
      latency: `${data.latency}ms`,
      error: data.error
    });
  }
};

export default logger;
