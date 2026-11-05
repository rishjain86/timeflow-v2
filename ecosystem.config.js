module.exports = {
  apps: [
    {
      name: 'timeflow-api',
      script: './apps/api/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
    {
      name: 'timeflow-web',
      script: './apps/web/.next/standalone/apps/web/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
