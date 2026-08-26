const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../src/config/prisma');
const slaPath = require.resolve('../src/services/slaService');
const controllerPath = require.resolve('../src/controllers/ticketController');

function loadController(fakePrisma) {
  delete require.cache[controllerPath];
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };
  require.cache[slaPath] = { id: slaPath, filename: slaPath, loaded: true, exports: {} };
  return require(controllerPath);
}

function createHarness(initialTicket) {
  let ticket = initialTicket ? { ...initialTicket } : null;
  const audits = [];
  const tx = {
    ticket: {
      findFirst: async ({ where }) => ticket && ticket.id === where.id && !ticket.deletedAt ? { ...ticket } : null,
      update: async ({ data }) => {
        const resolved = {};
        for (const [key, value] of Object.entries(data)) {
          resolved[key] = value && typeof value === 'object' && 'increment' in value
            ? (ticket[key] || 0) + value.increment
            : value;
        }
        ticket = { ...ticket, ...resolved };
        return { ...ticket };
      }
    },
    auditLog: { create: async ({ data }) => audits.push(data) }
  };
  return {
    prisma: { $transaction: async (callback) => callback(tx) },
    getTicket: () => ticket,
    audits
  };
}

function invoke(handler, { body, user, ticketId = 'ticket-1' }) {
  return new Promise((resolve, reject) => {
    const req = {
      body,
      user,
      params: { ticketId },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'node-test' }
    };
    const res = { json: resolve };
    handler(req, res, reject);
  });
}

const employee = { id: 'employee-1', role: 'EMPLOYEE' };
const admin = { id: 'admin-1', role: 'ADMIN' };
const baseTicket = {
  id: 'ticket-1', status: 'OPEN', assignedToId: employee.id, createdById: 'creator-1',
  isBlocked: false, blockedAt: null, blockReason: null, blockedCount: 0,
  startedAt: null, completedAt: null, deletedAt: null
};

test('employee cannot change an assigned ticket from OPEN to IN_PROGRESS', async () => {
  const harness = createHarness(baseTicket);
  const { TicketController } = loadController(harness.prisma);
  await assert.rejects(
    invoke(TicketController.updateTicket, { body: { status: 'IN_PROGRESS' }, user: employee }),
    (error) => error.statusCode === 403 && error.errorCode === 'STATUS_UPDATE_ADMIN_ONLY'
  );
  assert.equal(harness.getTicket().status, 'OPEN');
  assert.equal(harness.audits.length, 0);
});

test('employee cannot change an assigned OPEN ticket to BLOCKED', async () => {
  const harness = createHarness(baseTicket);
  const { TicketController } = loadController(harness.prisma);
  await assert.rejects(
    invoke(TicketController.updateTicket, { body: { status: 'BLOCKED' }, user: employee }),
    (error) => error.statusCode === 403 && error.errorCode === 'STATUS_UPDATE_ADMIN_ONLY'
  );
  assert.equal(harness.getTicket().status, 'OPEN');
  assert.equal(harness.getTicket().isBlocked, false);
  assert.equal(harness.audits.length, 0);
});

test('employee cannot update another employee ticket', async () => {
  const harness = createHarness({ ...baseTicket, assignedToId: 'employee-2' });
  const { TicketController } = loadController(harness.prisma);
  await assert.rejects(
    invoke(TicketController.updateTicket, { body: { status: 'BLOCKED' }, user: employee }),
    (error) => error.statusCode === 403 && error.errorCode === 'TICKET_NOT_ASSIGNED'
  );
  assert.equal(harness.audits.length, 0);
});

test('admin changes any ticket to BLOCKED with a status-only payload', async () => {
  const harness = createHarness({ ...baseTicket, assignedToId: 'employee-2' });
  const { TicketController } = loadController(harness.prisma);
  const response = await invoke(TicketController.updateTicket, { body: { status: 'BLOCKED' }, user: admin });
  assert.equal(response.success, true);
  assert.equal(response.data.ticket.status, 'BLOCKED');
});

test('admin reassigns and changes status atomically', async () => {
  const harness = createHarness(baseTicket);
  const { TicketController } = loadController(harness.prisma);
  const assignedToId = '9f494767-5237-49fe-89f9-4e21dc941738';
  const response = await invoke(TicketController.updateTicket, {
    body: { status: 'IN_PROGRESS', assignedToId }, user: admin
  });
  assert.equal(response.data.ticket.status, 'IN_PROGRESS');
  assert.equal(response.data.ticket.assignedToId, assignedToId);
  assert.equal(harness.audits[0].newValue.assignedToId, assignedToId);
});

test('admin can intentionally unassign with assignedToId null', () => {
  const { buildTicketUpdateData } = loadController({});
  assert.deepEqual(buildTicketUpdateData(baseTicket, { assignedToId: null }, 'ADMIN').assignedToId, null);
});

test('invalid status is rejected by PATCH validation with HTTP 400', () => {
  const { TicketValidator } = require('../src/validators/ticketValidator');
  const { ValidationMiddleware } = require('../src/middleware/validation');
  const middleware = ValidationMiddleware.validate(TicketValidator.updateTicket());
  const req = { body: { status: 'INVALID' } };
  let result;
  middleware(req, { status: (statusCode) => ({ json: (body) => { result = { statusCode, body }; } }) }, () => {});
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
});

test('missing ticket returns HTTP 404 error semantics', async () => {
  const harness = createHarness(null);
  const { TicketController } = loadController(harness.prisma);
  await assert.rejects(
    invoke(TicketController.updateTicket, { body: { status: 'BLOCKED' }, user: admin, ticketId: 'missing' }),
    (error) => error.statusCode === 404
  );
});

test('missing authorization returns HTTP 401 error semantics', async () => {
  const fakePrisma = {};
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };
  delete require.cache[require.resolve('../src/middleware/auth')];
  const AuthMiddleware = require('../src/middleware/auth');
  await new Promise((resolve, reject) => {
    AuthMiddleware.authenticate({ headers: {} }, {}, (error) => {
      try {
        assert.equal(error.statusCode, 401);
        assert.equal(error.errorCode, 'AUTH_REQUIRED');
        resolve();
      } catch (assertionError) { reject(assertionError); }
    });
  });
});

test.after(() => {
  delete require.cache[controllerPath];
  delete require.cache[slaPath];
  delete require.cache[prismaPath];
});
