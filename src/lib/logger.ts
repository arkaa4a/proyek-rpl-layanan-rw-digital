// Basic logger for the application
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const logger = {
  log: (level: LogLevel, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logOutput = { timestamp, level, message, meta };
    
    // In production, this could send to a logging service like Datadog or Sentry
    if (level === 'error') {
      console.error(JSON.stringify(logOutput));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logOutput));
    } else {
      console.log(JSON.stringify(logOutput));
    }
  },
  info: (message: string, meta?: any) => logger.log('info', message, meta),
  warn: (message: string, meta?: any) => logger.log('warn', message, meta),
  error: (message: string, meta?: any) => logger.log('error', message, meta),
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.log('debug', message, meta);
    }
  }
};
