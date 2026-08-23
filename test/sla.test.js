const test = require('node:test');
const assert = require('node:assert/strict');
const { getSLATiming } = require('../src/services/slaTiming');

const HOUR = 60 * 60 * 1000;

test('explicit deadline is authoritative for SLA timing', () => {
  const now = Date.parse('2026-08-23T12:00:00Z');
  const timing = getSLATiming({
    createdAt: '2026-08-23T00:00:00Z', deadline: '2026-08-24T00:00:00Z',
    slaHours: 4, estimatedHours: 4,
  }, now);
  assert.equal(timing.usagePercent, 50);
  assert.equal(timing.remainingHours, 12);
  assert.equal(timing.breached, false);
});

test('fractional SLA hours produce an accurate fallback deadline', () => {
  const createdAt = Date.parse('2026-08-23T10:00:00Z');
  const timing = getSLATiming({ createdAt, deadline: null, slaHours: 0.5 }, createdAt + 30 * 60 * 1000);
  assert.equal(timing.dueAt, createdAt + 0.5 * HOUR);
  assert.equal(timing.usagePercent, 100);
  assert.equal(timing.breached, true);
});
