module.exports = {
  // Lint and format TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  // Format markup, stylesheets, and data files
  '*.{json,yaml,yml,md,mdx,css,scss}': [
    'prettier --write'
  ]
};
