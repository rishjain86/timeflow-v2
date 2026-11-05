/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./eslint.base.js'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // In a production backend, we prefer using a dedicated logger (like Pino) 
    // rather than raw console.log statements.
    'no-console': 'warn',
  },
};
