const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
function validateEnvironment(env = process.env) {
  const productionLike = env.NODE_ENV === 'production' || /^https:\/\//i.test(env.FRONTEND_URL || '');
  if (!productionLike) return;
  const required = [...requiredInProduction];
  if (env.RUN_CRON === 'true') required.push('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM');
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  if (env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
  for (const name of ['FRONTEND_URL', 'CORS_ORIGINS']) {
    if (!env[name]) continue;
    for (const value of env[name].split(',').map((item) => item.trim()).filter(Boolean)) {
      let url;
      try { url = new URL(value); } catch { throw new Error(`${name} contains an invalid URL: ${value}`); }
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        throw new Error(`${name} must use HTTPS in production: ${value}`);
      }
      if (url.pathname !== '/' || url.search || url.hash) {
        throw new Error(`${name} must contain origins only (no path, query, or hash): ${value}`);
      }
    }
  }
}
module.exports = { validateEnvironment };
