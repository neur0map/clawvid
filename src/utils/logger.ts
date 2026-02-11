import pino from 'pino';

const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
});

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

export function createLogger(name: string): Logger {
  const child = rootLogger.child({ module: name });

  return {
    info: (msg, data) => data ? child.info(data, msg) : child.info(msg),
    warn: (msg, data) => data ? child.warn(data, msg) : child.warn(msg),
    error: (msg, data) => data ? child.error(data, msg) : child.error(msg),
    debug: (msg, data) => data ? child.debug(data, msg) : child.debug(msg),
  };
}
