module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // Apps
        'api',
        'web',
        // Packages
        'config',
        'types',
        'ui',
        'utils',
        'validation',
        // Repository wide
        'repo',
        'deps',
        'release'
      ],
    ],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'chore',
        'style',
        'refactor',
        'ci',
        'test',
        'revert',
        'perf',
        'build',
      ],
    ],
  },
};
