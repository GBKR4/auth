// Production-grade logger using pino
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Attach convenience .request() used elsewhere in the codebase
logger.request = (req, meta = {}) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get?.('user-agent'),
    ...meta,
    msg: 'HTTP Request',
  });
};

// Attach convenience .query() used elsewhere in the codebase (dev-only)
logger.query = (sql, params = [], meta = {}) => {
  if (isDev) {
    logger.debug({ sql, params, ...meta, msg: 'Database Query' });
  }
};

export default logger;
