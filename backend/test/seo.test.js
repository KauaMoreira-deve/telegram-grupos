import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, afterEach, before, mock, test } from 'node:test';
import conexao from '../src/config/database.js';
import { canonicalRedirect, categoryDescription, createPageRenderer, fullTitle } from '../src/services/seoRenderer.js';
import { invalidateCache } from '../src/utils/cache.js';

// Dados de teste representativos; nenhuma consulta chega ao banco real.
const categoryRow = { id: 3, name: 'Casais', url: 'casais', headline: null, subheadline: null, groupCount: 3 };
const groupRow = {
  id: 41,
  name: 'Grupo Teste Ativo',
  category: 'Casais',
  categoryUrl: 'casais',
  description: 'Descrição específica do grupo de teste, escrita pelo administrador no painel com detalhes do conteúdo.',
  image: 'https://cdn.exemplo.com/grupo-41.jpg',
  link: 'https://t.me/grupo_teste_41',
  featured: 0,
  members: 1234,
  accesses: 10,
  likes: 2,
  createdAt: '01/10/2026',
  createdAtIso: '2026-10-01T12:00:00',
  membersUpdatedAt: '01/11/2026 10:00',
  hashtags: 'casal,teste',
};

function mockDatabase({ fail = false } = {}) {
  mock.method(conexao, 'query', async (sql, params = []) => {
    if (fail) throw Object.assign(new Error('falha simulada'), { code: 'ECONNREFUSED' });
    if (/headline_categoria AS headline/.test(sql)) return [[categoryRow], []];
    if (/WHERE g\.id_grupo = \?/.test(sql)) return [String(params[0]) === String(groupRow.id) ? [groupRow] : [], []];
    throw new Error(`Consulta não prevista no teste: ${sql}`);
  });
}

afterEach(() => {
  mock.restoreAll();
  invalidateCache('public:');
});

let templateDirectory;
let renderPage;

before(async () => {
  templateDirectory = await mkdtemp(path.join(tmpdir(), 'seo-test-'));
  const indexFile = path.join(templateDirectory, 'index.html');
  await writeFile(indexFile, '<!doctype html><html lang="pt-BR"><head><title>Padrão</title><meta name="description" content="Padrão" /></head><body><div id="root"></div></body></html>');
  renderPage = createPageRenderer({ indexFile, cacheTemplate: false });
});

after(async () => {
  await rm(templateDirectory, { recursive: true, force: true });
});

async function render(pathname) {
  const response = { headers: {} };
  await renderPage({ path: pathname, originalUrl: pathname }, {
    setHeader(name, value) { response.headers[name] = value; },
    status(code) { response.status = code; return this; },
    type() { return this; },
    send(html) { response.html = html; },
    redirect(code, location) { response.status = code; response.location = location; },
  }, (error) => { throw error; });
  return response;
}

function redirectFor(req) {
  let result = { next: false };
  canonicalRedirect(
    { method: 'GET', hostname: 'putarianotelegram.net', ...req },
    { redirect(status, location) { result = { status, location }; } },
    () => { result = { next: true }; },
  );
  return result;
}

test('título recebe a marca quando cabe e nunca corta palavras', () => {
  assert.equal(fullTitle('Termos de uso'), 'Termos de uso | Putaria no Telegram');
  assert.equal(fullTitle('Grupos de Putaria no Telegram +18'), 'Grupos de Putaria no Telegram +18');

  const longTitle = 'Bate-papo +18 No Telegram. Amizade Namoro, Insetos e Muito Mais Para Conversar';
  const result = fullTitle(longTitle);
  assert.ok(result.length <= 70);
  assert.ok(longTitle.startsWith(result), 'o título é cortado só no fim');
  assert.ok(longTitle.charAt(result.length) === ' ', 'o corte acontece entre palavras');
});

test('título de grupo longo perde a marca antes de perder palavras', () => {
  const title = '🔞🫣MULHERES CASADAS PUTARIA: grupo +18 no Telegram';
  assert.equal(fullTitle(title), title);
});

test('descrição da categoria usa o texto do painel ou o total de grupos', () => {
  assert.equal(categoryDescription({ name: 'Casais', subheadline: '  Texto do painel.  ' }), 'Texto do painel.');
  assert.match(categoryDescription({ name: 'Casais', groupCount: 12 }), /^12 grupos de Casais no Telegram \(\+18\) com links ativos e verificados\./);
  assert.match(categoryDescription({ name: 'Hentai', groupCount: 1 }), /^1 grupo de Hentai no Telegram \(\+18\) com link ativo e verificado\./);
  assert.match(categoryDescription({ name: 'Trans', groupCount: 0 }), /^Grupos de Trans no Telegram/);
  assert.ok(categoryDescription({ name: 'Bate-papo +18', groupCount: 999 }).length <= 160);
});

test('www, barra final e /index.html redirecionam para a URL canônica', () => {
  assert.deepEqual(redirectFor({ hostname: 'www.putarianotelegram.net', path: '/sobre', originalUrl: '/sobre?x=1' }), { status: 301, location: 'https://putarianotelegram.net/sobre?x=1' });
  assert.deepEqual(redirectFor({ path: '/sobre/', originalUrl: '/sobre/' }), { status: 301, location: '/sobre' });
  assert.deepEqual(redirectFor({ path: '/categorias/amadores//', originalUrl: '/categorias/amadores//?hashtag=a' }), { status: 301, location: '/categorias/amadores?hashtag=a' });
  assert.deepEqual(redirectFor({ path: '/index.html', originalUrl: '/index.html' }), { status: 301, location: '/' });
});

test('redirecionamento canônico não afeta a API, outros métodos nem URLs corretas', () => {
  assert.deepEqual(redirectFor({ path: '/', originalUrl: '/' }), { next: true });
  assert.deepEqual(redirectFor({ path: '/sobre', originalUrl: '/sobre' }), { next: true });
  assert.deepEqual(redirectFor({ path: '/api/public/groups/', originalUrl: '/api/public/groups/' }), { next: true });
  assert.deepEqual(redirectFor({ method: 'POST', path: '/sobre/', originalUrl: '/sobre/' }), { next: true });
});

test('redirecionamento canônico não leva para outro domínio', () => {
  assert.deepEqual(redirectFor({ path: '//exemplo.com/', originalUrl: '//exemplo.com/' }), { status: 301, location: '/exemplo.com' });
  assert.deepEqual(redirectFor({ path: '/\\exemplo.com/', originalUrl: '/\\exemplo.com/' }), { status: 301, location: '/exemplo.com' });
});

test('página inicial sai do servidor com título, canonical e imagem de compartilhamento', async () => {
  const { status, html } = await render('/');
  assert.equal(status, 200);
  assert.match(html, /<title>Grupos de Putaria no Telegram \+18: links ativos e verificados<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/putarianotelegram\.net\/" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/putarianotelegram\.net\/og-image\.webp" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.doesNotMatch(html, /<title>Padrão<\/title>/);
  assert.equal((html.match(/<title>/g) || []).length, 1);
});

test('trilha de navegação das páginas fixas usa o rótulo visível', async () => {
  const { html } = await render('/sobre');
  assert.match(html, /"position":2,"name":"Sobre","item":"https:\/\/putarianotelegram\.net\/sobre"/);
});

test('página de categoria sai do servidor com os dados reais da categoria', async () => {
  mockDatabase();
  const { status, html } = await render('/categorias/casais');
  assert.equal(status, 200);
  assert.match(html, /<title>Grupos de Casais no Telegram \+18 \| Putaria no Telegram<\/title>/);
  assert.match(html, /<meta name="description" content="3 grupos de Casais no Telegram \(\+18\) com links ativos e verificados\./);
  assert.match(html, /<link rel="canonical" href="https:\/\/putarianotelegram\.net\/categorias\/casais" \/>/);
  assert.match(html, /"name":"Início".*"name":"Categorias".*"name":"Casais"/);

  const missing = await render('/categorias/inexistente');
  assert.equal(missing.status, 404);
  assert.match(missing.html, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
});

test('página de grupo usa nome, descrição e imagem do próprio grupo', async () => {
  mockDatabase();
  const { status, html } = await render('/grupos/Grupo-Teste-Ativo-41');
  assert.equal(status, 200);
  assert.match(html, /<title>Grupo Teste Ativo: grupo \+18 no Telegram \| Putaria no Telegram<\/title>/);
  assert.match(html, /<meta name="description" content="Descrição específica do grupo de teste/);
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/putarianotelegram\.net\/grupos\/Grupo-Teste-Ativo-41" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/cdn\.exemplo\.com\/grupo-41\.jpg" \/>/);
});

test('grupo com slug antigo redireciona e grupo inativo ou removido responde 404', async () => {
  mockDatabase();
  const renamed = await render('/grupos/nome-antigo-41');
  assert.deepEqual([renamed.status, renamed.location], [301, '/grupos/Grupo-Teste-Ativo-41']);

  const inactive = await render('/grupos/Grupo-Removido-42');
  assert.equal(inactive.status, 404);
  assert.match(inactive.html, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
});

test('falha no banco responde 503 temporário em vez de 200 com metas genéricas', async () => {
  mockDatabase({ fail: true });
  const { status, headers, html } = await render('/grupos/Grupo-Teste-Ativo-41');
  assert.equal(status, 503);
  assert.equal(headers['Retry-After'], '120');
  assert.match(html, /<div id="root"><\/div>/, 'o visitante continua recebendo o site');
});

test('página inexistente responde 404, noindex e sem imagem de compartilhamento', async () => {
  const { status, html } = await render('/pagina-que-nao-existe');
  assert.equal(status, 404);
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
  assert.doesNotMatch(html, /og:image/);
});

test('URLs com codificação inválida retornam 400 sem simular indisponibilidade do banco', async () => {
  const database = mock.method(conexao, 'query', async () => { throw new Error('URL inválida não deve consultar o banco.'); });
  for (const url of ['/grupos/%ZZ', '/categorias/%ZZ']) {
    const response = await render(url);
    assert.equal(response.status, 400);
    assert.equal(response.headers['Retry-After'], undefined);
    assert.match(response.html, /noindex/);
  }
  assert.equal(database.mock.callCount(), 0);
});
