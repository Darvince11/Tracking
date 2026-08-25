const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the SLA reconciliation migration enforces a floating-point database column', () => {
  const migration = fs.readFileSync(path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    '20260825000000_reconcile_sla_hours_double',
    'migration.sql'
  ), 'utf8');

  assert.match(migration, /ALTER COLUMN "slaHours" TYPE DOUBLE PRECISION/);
});
