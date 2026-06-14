import { logger as pinoLogger } from '../lib/logger';

const wrapMethod = (level: 'info' | 'error' | 'warn' | 'debug') => {
  return (msgOrObj: any, ...args: any[]) => {
    if (typeof msgOrObj === 'string') {
      // Winston format: logger.info("message", metaOrError)
      const firstArg = args[0];
      if (firstArg instanceof Error) {
        pinoLogger[level]({ err: firstArg }, msgOrObj);
      } else if (firstArg && typeof firstArg === 'object') {
        pinoLogger[level](firstArg, msgOrObj);
      } else {
        pinoLogger[level](msgOrObj);
      }
    } else {
      // Pino format: logger.info(obj, "message")
      pinoLogger[level](msgOrObj, ...args);
    }
  };
};

export const logger = {
  info: wrapMethod('info'),
  error: wrapMethod('error'),
  warn: wrapMethod('warn'),
  debug: wrapMethod('debug'),
  log: (level: string, msg: any, ...args: any[]) => {
    const pinoLevel = level === 'warn' ? 'warn' : level === 'error' ? 'error' : level === 'debug' ? 'debug' : 'info';
    wrapMethod(pinoLevel)(msg, ...args);
  }
};

export default logger;

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
    logger[level]({
      requestId: data.requestId,
      orgId: data.orgId,
      endpoint: data.endpoint,
      status: data.status,
      latency: `${data.latency}ms`,
      error: data.error
    }, data.message || (isError ? 'Request processed' : 'Slow request detected'));
  }
};

export { pinoLogger as rawPinoLogger };
