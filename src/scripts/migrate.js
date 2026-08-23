const { spawnSync } = require('node:child_process');

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error('DIRECT_URL is required for database migrations. Use the Supabase session pooler URL on port 5432.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(directUrl);
} catch {
  console.error('DIRECT_URL is not a valid PostgreSQL connection URL.');
  process.exit(1);
}

if (parsed.port === '6543') {
  console.error('DIRECT_URL must not use Supabase transaction-pooler port 6543. Select the Session pooler URL on port 5432.');
  process.exit(1);
}

console.log(`Running migrations through ${parsed.hostname}:${parsed.port || '5432'}...`);
const prismaBin = process.platform === 'win32'
  ? './node_modules/.bin/prisma.cmd'
  : './node_modules/.bin/prisma';

const result = spawnSync(prismaBin, ['migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: directUrl },
  stdio: 'inherit',
  timeout: 120000,
});

if (result.error?.code === 'ETIMEDOUT') {
  console.error('Database migration timed out after 120 seconds. Check the DIRECT_URL host and Supabase availability.');
  process.exit(1);
}
if (result.error) {
  console.error(`Unable to start Prisma migration: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
