/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    './eslint.base.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'next/core-web-vitals',
  ],
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  rules: {
    // React 17+ doesn't need React in scope for JSX
    'react/react-in-jsx-scope': 'off',
    // We use TypeScript interfaces instead of PropTypes
    'react/prop-types': 'off',
    // Next.js <Link> specific a11y rules
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
