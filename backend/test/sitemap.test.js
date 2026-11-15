import assert from 'node:assert/strict';
import { after, afterEach, mock, test } from 'node:test';
import conexao from '../src/config/database.js';
import {
  getFooterCatalog,
  getPublicGroups,
  getPublicStats,
  getSitemap,
  loadFooterCatalog,
  loadPublicCategories,
  loadPublicGroups,
  loadPublicStats,
} from '../src/controllers/publicController.js';
import { invalidateCache } from '../src/utils/cache.js';

// Todas as consultas são interceptadas; estes testes não usam banco ou Telegram reais.
const category = { id: 3, name: 'Categoria Teste', url: 'categoria-teste', groupCount: 1 };
const group = { id: 41, name: 'Grupo de Teste', category: category.name, categoryUrl: category.url, featured: 0, hashtags: 'teste,exemplo' };

afterEach(() => {
  mock.restoreAll();
  invalidateCache('public:');
});
after(async () => { await conexao.end(); });

function responseRecorder() {
  const response = { statusCode: 200, headers: {}, body: null, contentType: null };
  return Object.assign(response, {
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    type(value) { this.contentType = value; return this; },
    send(value) { this.body = value; return this; },
    json(value) { this.body = value; return this; },
  });
}

async function sitemap() {
  const response = responseRecorder();
  await getSitemap({}, response);
  return response;
}

function locations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

test('sitemap publica somente o catálogo ativo, URLs canônicas e XML sem datas inventadas', async () => {
  const queries = [];
  mock.method(conexao, 'query', async (sql) => {
    queries.push(sql);
    assert.match(sql, /g\.status_grupo = 'ativo'/);
    assert.match(sql, /c\.status_categoria = 'ativo'/);
    assert.match(sql, /JOIN tbl_(?:categoria|grupo_telegram)/);
    // Duplicatas defensivas não devem produzir URLs repetidas.
    return /SELECT DISTINCT c\.url_categoria/.test(sql)
      ? [[{ url: category.url }, { url: category.url }, { url: 'categoria & teste' }], []]
      : [[group, group, { id: 42, name: 'Café & Amigos <teste>', lastModified: '2001-01-01' }], []];
  });

  const response = await sitemap();
  assert.equal(response.statusCode, 200);
  assert.equal(response.contentType, 'application/xml');
  assert.equal(response.headers['Cache-Control'], 'no-cache');
  assert.match(response.body, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(response.body, /<\/urlset>\n$/);
  assert.doesNotMatch(response.body, /<lastmod>/);
  assert.doesNotMatch(response.body, /Café|<teste>|data_criacao/);
  const urls = locations(response.body);
  assert.equal(urls.length, 11, 'sete páginas fixas, duas categorias e dois grupos');
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes('https://putarianotelegram.net/grupos/Grupo-de-Teste-41'));
  assert.ok(urls.includes('https://putarianotelegram.net/grupos/Cafe-Amigos-teste-42'));
  assert.ok(urls.includes('https://putarianotelegram.net/categorias/categoria%20%26%20teste'));
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.origin, 'https://putarianotelegram.net');
    assert.equal(url.hash, '');
    assert.equal(url.search, '');
    assert.ok(!url.pathname.endsWith('/') || url.pathname === '/');
  }
  assert.equal(queries.length, 2);
});

test('sitemap reflete criação, remoção e desativação na próxima leitura sem cache antigo', async () => {
  let rows = [group];
  mock.method(conexao, 'query', async (sql) => [
    /SELECT DISTINCT c\.url_categoria/.test(sql)
      ? rows.map(() => ({ url: category.url }))
      : rows,
    [],
  ]);
  assert.ok(locations((await sitemap()).body).includes('https://putarianotelegram.net/grupos/Grupo-de-Teste-41'));
  rows = [{ ...group, id: 43, name: 'Novo Grupo' }];
  const changed = locations((await sitemap()).body);
  assert.ok(changed.includes('https://putarianotelegram.net/grupos/Novo-Grupo-43'));
  assert.ok(!changed.some((url) => url.endsWith('-41')));
  rows = [];
  const empty = locations((await sitemap()).body);
  assert.equal(empty.length, 7);
  assert.ok(!empty.some((url) => url.includes('/grupos/') || url.includes('/categorias/')));
});

test('falha em uma consulta do sitemap retorna 503 temporário sem XML parcial', async () => {
  mock.method(conexao, 'query', async (sql) => {
    if (/SELECT DISTINCT c\.url_categoria/.test(sql)) throw Object.assign(new Error('falha simulada'), { code: 'ECONNREFUSED' });
    return [[group], []];
  });
  const response = await sitemap();
  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Retry-After'], '120');
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.contentType, 'text/plain');
  assert.doesNotMatch(response.body, /<urlset>|<loc>/);
});

function mockPublicReads() {
  const queries = [];
  let totalGroups = 1;
  mock.method(conexao, 'query', async (sql) => {
    queries.push(sql);
    assert.match(sql.trim(), /^SELECT\b/, 'SSR não escreve no banco');
    assert.doesNotMatch(sql, /LIMIT 12/, 'SSR não consulta grupos para atualizar membros');
    if (/AS totalGroups/.test(sql)) return [[{ totalGroups, totalMembers: 123 }], []];
    if (/AS totalCategories/.test(sql)) return [[{ totalCategories: 1 }], []];
    if (/AS totalAccesses/.test(sql)) return [[{ totalAccesses: 5 }], []];
    if (/SELECT DISTINCT h\.nome_hashtag/.test(sql)) return [[{ name: 'teste' }], []];
    if (/SELECT DISTINCT c\.id_categoria/.test(sql)) return [[category], []];
    if (/headline_categoria AS headline/.test(sql)) return [[category], []];
    if (/g\.id_grupo AS id/.test(sql)) return [[group], []];
    throw new Error('Consulta inesperada.');
  });
  return { queries, changeTotal(value) { totalGroups = value; } };
}

test('loaders do SSR retornam os mesmos dados públicos sem atualizar membros ou chamar Telegram', async () => {
  const { queries } = mockPublicReads();
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('SSR não deve acessar serviços externos.'); });
  const [groups, categories, stats, footer] = await Promise.all([
    loadPublicGroups({ refreshMembers: false }),
    loadPublicCategories(),
    loadPublicStats(),
    loadFooterCatalog(),
  ]);
  assert.deepEqual(groups, [{ ...group, featured: false, hashtags: ['teste', 'exemplo'] }]);
  assert.deepEqual(categories, [category]);
  assert.deepEqual(stats, { totalGroups: 1, totalMembers: 123, totalCategories: 1, totalAccesses: 5 });
  assert.deepEqual(footer, { categories: [category], hashtags: ['teste'] });
  assert.equal(queries.length, 7);
  assert.equal(network.mock.callCount(), 0);

  const statsResponse = responseRecorder();
  const footerResponse = responseRecorder();
  await getPublicStats({}, statsResponse);
  await getFooterCatalog({}, footerResponse);
  assert.deepEqual(statsResponse.body, stats);
  assert.deepEqual(footerResponse.body, footer);
  assert.equal(statsResponse.headers['Cache-Control'], 'public, max-age=30, stale-while-revalidate=120');
  assert.equal(footerResponse.headers['Cache-Control'], 'public, max-age=300, stale-while-revalidate=1200');
  assert.equal(queries.length, 7, 'APIs e SSR compartilham o cache existente');
});

test('invalidação administrativa atualiza os loaders compartilhados sem esperar o TTL', async () => {
  const database = mockPublicReads();
  assert.equal((await loadPublicStats()).totalGroups, 1);
  database.changeTotal(2);
  assert.equal((await loadPublicStats()).totalGroups, 1);
  invalidateCache('public:');
  assert.equal((await loadPublicStats()).totalGroups, 2);
});

test('API de grupos preserva a consulta habitual de atualização de membros', async () => {
  let refreshQueries = 0;
  mock.method(conexao, 'query', async (sql) => {
    if (/LIMIT 12/.test(sql)) {
      refreshQueries += 1;
      return [[], []];
    }
    assert.match(sql.trim(), /^SELECT\b/);
    return [[group], []];
  });
  const response = responseRecorder();
  await getPublicGroups({}, response);
  assert.equal(refreshQueries, 1);
  assert.equal(response.body[0].id, group.id);
  assert.equal(response.headers['Cache-Control'], 'public, max-age=30, stale-while-revalidate=120');
});

test('API agenda atualização de membros após cache preenchido pelo SSR e limita repetições', async () => {
  let refreshQueries = 0;
  let catalogQueries = 0;
  mock.method(conexao, 'query', async (sql) => {
    assert.match(sql.trim(), /^SELECT\b/);
    if (/LIMIT 12/.test(sql)) {
      refreshQueries += 1;
      return [[], []];
    }
    catalogQueries += 1;
    return [[group], []];
  });

  await loadPublicGroups({ refreshMembers: false });
  assert.equal(refreshQueries, 0, 'SSR preenche somente o catálogo');
  assert.equal(catalogQueries, 1);

  await getPublicGroups({}, responseRecorder());
  assert.equal(refreshQueries, 1, 'API sincroniza mesmo com catálogo em cache');
  assert.equal(catalogQueries, 1, 'o catálogo existente continua compartilhado');
  await getPublicGroups({}, responseRecorder());
  assert.equal(refreshQueries, 1, 'leituras sucessivas respeitam o TTL de agendamento');

  // Aguarda a tarefa assíncrona anterior antes de simular alteração administrativa.
  await new Promise(setImmediate);
  invalidateCache('public:');
  await loadPublicGroups({ refreshMembers: false });
  assert.equal(refreshQueries, 1, 'SSR continua sem agendar após a invalidação');
  await getPublicGroups({}, responseRecorder());
  assert.equal(refreshQueries, 2, 'invalidação administrativa também renova o agendamento');
  assert.equal(catalogQueries, 2);
});
