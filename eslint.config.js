const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '.tmp-auth-tests/*',
      '.tmp-auth-tests/**/*',
      '.tmp-unit-tests/*',
      '.tmp-unit-tests/**/*',
      'skills/*',
      'skills/**/*',
    ],
  },
  {
    rules: {
      'react/display-name': 'off',
    },
  },
]);
