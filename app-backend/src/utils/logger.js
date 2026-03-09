// Logging utility

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

class Logger {
  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };

    // In production, you might want to send this to a logging service
    console.log(JSON.stringify(logEntry));
  }

  error(message, meta = {}) {
    this.log(logLevels.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(logLevels.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(logLevels.INFO, message, meta);
  }

  debug(message, meta = {}) {
    // Only log debug messages in development
    if (process.env.NODE_ENV === 'development') {
      this.log(logLevels.DEBUG, message, meta);
    }
  }

  // Convenience method for HTTP request logging
  request(req, meta = {}) {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...meta,
    });
  }

  // Convenience method for database query logging
  query(sql, params = [], meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.debug('Database Query', {
        sql,
        params,
        ...meta,
      });
    }
  }
}

export default new Logger();
