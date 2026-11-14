import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { app } from '../index.js';
import conexao from '../src/config/database.js';

// Cada arquivo de teste roda em um processo separado: aqui o servidor nunca é
// marcado como pronto, simulando o intervalo entre o app.listen() e o fim das migrations.
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

test('enquanto o servidor inicia, o healthcheck informa "starting"', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'starting' });
});

test('enquanto o servidor inicia, as rotas que dependem do banco respondem 503', async () => {
  for (const path of ['/api/public/groups', '/api/admin/session', '/api/rota-inexistente']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 503, `${path} deveria aguardar a inicialização`);
    assert.equal((await response.json()).status, 'starting');
  }
});
