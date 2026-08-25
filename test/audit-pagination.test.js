const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../src/config/prisma');
const controllerPath = require.resolve('../src/controllers/AdminToolsController');

function loadController(fakePrisma) {
  delete require.cache[controllerPath];
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: fakePrisma
  };
  return require(controllerPath).AdminToolsController;
}

function invoke(handler, query) {
  return new Promise((resolve, reject) => {
    const req = { query };
    const res = { json: resolve };
    handler(req, res, reject);
  });
}

test('audit pagination applies identical filters and returns distinct pages', async () => {
  const calls = [];
  const records = Array.from({ length: 35 }, (_, index) => ({ id: `audit-${35 - index}` }));
  const fakePrisma = {
    auditLog: {
      findMany: async (query) => {
        calls.push({ type: 'findMany', query });
        return records.slice(query.skip, query.skip + query.take);
      },
      count: async (query) => {
        calls.push({ type: 'count', query });
        return records.length;
      }
    }
  };
  const controller = loadController(fakePrisma);
  const filters = { action: 'UPDATE', search: 'ticket', limit: '10' };

  const first = await invoke(controller.getAuditLogs, { ...filters, page: '1' });
  const second = await invoke(controller.getAuditLogs, { ...filters, page: '2' });

  assert.deepEqual(first.data.pagination, {
    page: 1, limit: 10, total: 35, totalPages: 4, hasNext: true, hasPrev: false
  });
  assert.deepEqual(second.data.pagination, {
    page: 2, limit: 10, total: 35, totalPages: 4, hasNext: true, hasPrev: true
  });
  assert.equal(calls[0].query.skip, 0);
  assert.equal(calls[2].query.skip, 10);
  assert.deepEqual(calls[0].query.where, calls[1].query.where);
  assert.deepEqual(calls[2].query.where, calls[3].query.where);
  assert.deepEqual(calls[0].query.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
  assert.notDeepEqual(first.data.logs.map(({ id }) => id), second.data.logs.map(({ id }) => id));
});

test.after(() => {
  delete require.cache[controllerPath];
  delete require.cache[prismaPath];
});
