const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
function validateEnvironment(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const missing = requiredInProduction.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  if (env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
}
module.exports = { validateEnvironment };
