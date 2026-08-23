const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnvironment } = require('../src/config/env');

test('production environment rejects missing secrets', () => {
  assert.throws(() => validateEnvironment({ NODE_ENV: 'production' }), /Missing required/);
});

test('production environment rejects weak JWT secrets', () => {
  assert.throws(() => validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', FRONTEND_URL: 'https://app.example.com', JWT_SECRET: 'short' }), /at least 32/);
});

test('production environment accepts a complete configuration', () => {
  assert.doesNotThrow(() => validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', FRONTEND_URL: 'https://app.example.com', JWT_SECRET: 'a'.repeat(32) }));
});

test('production cron requires SMTP delivery configuration', () => {
  assert.throws(() => validateEnvironment({
    NODE_ENV: 'production', DATABASE_URL: 'postgres://db', FRONTEND_URL: 'https://app.example.com',
    JWT_SECRET: 'a'.repeat(32), RUN_CRON: 'true'
  }), /SMTP_HOST/);

  assert.doesNotThrow(() => validateEnvironment({
    NODE_ENV: 'production', DATABASE_URL: 'postgres://db', FRONTEND_URL: 'https://app.example.com',
    JWT_SECRET: 'a'.repeat(32), RUN_CRON: 'true', SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'mailer', SMTP_PASS: 'secret', SMTP_FROM: 'alerts@example.com'
  }));
});
