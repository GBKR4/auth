// PM2 process manager configuration
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup   (auto-restart on server reboot)

module.exports = {
  apps: [
    {
      name:             'auth-api',
      script:           'server.js',
      interpreter:      'node',
      interpreter_args: '--experimental-specifier-resolution=node',

      // ── Clustering ─────────────────────────────────────────────────────────
      // 'max' spawns one worker per CPU core.
      // Use a fixed number (e.g. 2) if you prefer predictable resource usage.
      instances:   'max',
      exec_mode:   'cluster',

      // ── Environment ────────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT:     3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     3000,
      },

      // ── Reliability ────────────────────────────────────────────────────────
      watch:              false,          // do NOT watch in prod (use CI/CD deploys)
      max_memory_restart: '512M',         // restart the process if it leaks memory
      restart_delay:      3000,           // wait 3 s between crashes
      max_restarts:       10,             // stop restarting after 10 consecutive failures

      // ── Logging ────────────────────────────────────────────────────────────
      // Pino writes structured JSON to stdout; redirect to files here so
      // PM2's log rotation can manage them.
      out_file:    './logs/out.log',
      error_file:  './logs/error.log',
      merge_logs:  true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
