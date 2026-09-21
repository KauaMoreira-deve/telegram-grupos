import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { app } from '../index.js';
import conexao from '../src/config/database.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await conexao.end();
});

test('healthcheck é mínimo e recebe headers de segurança', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('rotas inexistentes retornam 404 em JSON sem detalhes internos', async () => {
  const response = await fetch(`${baseUrl}/rota-inexistente`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { erro: 'Rota não encontrada.' });
});

test('JSON malformado retorna erro controlado', async () => {
  const response = await fetch(`${baseUrl}/api/public/group-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.erro, 'O corpo da requisição contém JSON inválido.');
  assert.equal(typeof body.requestId, 'string');
});

test('todas as areas administrativas exigem autenticacao', async () => {
  const protectedRoutes = [
    ['GET', '/api/admin/session'],
    ['GET', '/api/admin/stats'],
    ['GET', '/api/admin/groups'],
    ['POST', '/api/admin/groups'],
    ['GET', '/api/admin/groups/1'],
    ['PUT', '/api/admin/groups/1'],
    ['DELETE', '/api/admin/groups/1'],
    ['GET', '/api/admin/categories'],
    ['POST', '/api/admin/categories'],
    ['PUT', '/api/admin/categories/1'],
    ['DELETE', '/api/admin/categories/1'],
    ['GET', '/api/admin/users'],
    ['POST', '/api/admin/users'],
    ['PUT', '/api/admin/users/1'],
    ['DELETE', '/api/admin/users/1'],
    ['GET', '/api/admin/group-submissions'],
    ['POST', '/api/admin/group-submissions/1/approve'],
    ['POST', '/api/admin/group-submissions/1/reject'],
    ['PUT', '/api/admin/profile'],
  ];

  for (const [method, path] of protectedRoutes) {
    const response = await fetch(`${baseUrl}${path}`, { method });
    assert.equal(response.status, 401, `${method} ${path} deveria exigir autenticacao`);
    assert.equal((await response.json()).erro, 'Autenticação necessária.');
  }
});

test('rotas de API inexistentes nunca retornam o frontend', async () => {
  const response = await fetch(`${baseUrl}/api/rota-inexistente`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal((await response.json()).erro, 'Rota não encontrada.');
});
