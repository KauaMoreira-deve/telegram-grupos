import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, afterEach, before, mock, test } from 'node:test';
import conexao from '../src/config/database.js';
import { createPageRenderer } from '../src/services/seoRenderer.js';
import { invalidateCache } from '../src/utils/cache.js';

const entryUrl = new URL('../../frontend/dist-server/entry-server.js', import.meta.url);
const hasBuiltFrontend = existsSync(entryUrl);
const realPageTest = (name, run) => test(name, {
  skip: hasBuiltFrontend ? false : 'Execute npm run build antes dos testes de integração SSR.',
}, run);

const categories = [
  { id: 1, name: 'Categoria Alfa', url: 'categoria-alfa', headline: 'Título real da categoria Alfa', subheadline: 'Descrição real cadastrada para a categoria Alfa.', groupCount: 2 },
  { id: 2, name: 'Categoria Beta', url: 'categoria-beta', headline: null, subheadline: null, groupCount: 1 },
];
const groupBase = {
  category: categories[0].name,
  categoryUrl: categories[0].url,
  image: null,
  featured: 0,
  members: 1234,
  accesses: 10,
  likes: 2,
  createdAt: '01/10/2026',
  createdAtIso: '2026-10-01T12:00:00',
  membersUpdatedAt: '01/11/2026 10:00',
  hashtags: 'teste',
};
// Exemplos neutros de formatos reais: nomes distintos, mais de uma categoria e membros indisponíveis.
const groups = [
  { ...groupBase, id: 41, name: 'Grupo Teste Alfa', description: 'Descrição exclusiva cadastrada para o grupo Alfa.', link: 'https://t.me/grupo_teste_alfa', featured: 1 },
  { ...groupBase, id: 42, name: 'Comunidade Beta', description: 'Descrição exclusiva cadastrada para a comunidade Beta.', link: 'https://t.me/comunidade_beta', members: null },
  { ...groupBase, id: 43, name: 'Clube Gama', description: 'Descrição exclusiva cadastrada para o clube Gama.', link: 'https://t.me/clube_gama', category: categories[1].name, categoryUrl: categories[1].url },
];
const groupPaths = ['/grupos/Grupo-Teste-Alfa-41', '/grupos/Comunidade-Beta-42', '/grupos/Clube-Gama-43'];

let directory;
let indexFile;
let compiledRender;

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'rendered-pages-test-'));
  indexFile = path.join(directory, 'index.html');
  await writeFile(indexFile, '<!doctype html><html lang="pt-BR"><head><title>Inicial</title><meta name="rating" content="adult" /></head><body><div id="root"></div></body></html>');
  if (hasBuiltFrontend) ({ renderPage: compiledRender } = await import(entryUrl.href));
});

afterEach(() => {
  mock.restoreAll();
  invalidateCache('public:');
});

after(async () => {
  await conexao.end();
  await rm(directory, { recursive: true, force: true });
});

function mockPublicDatabase(rows = groups) {
  const queries = [];
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('SSR não deve iniciar requisições externas.'); });
  mock.method(conexao, 'query', async (sql, params = []) => {
    queries.push(sql);
    assert.match(sql.trim(), /^SELECT\b/, 'renderização pública não escreve no banco');
    assert.doesNotMatch(sql, /LIMIT 12/, 'renderização não inicia sincronização de membros');
    if (/WHERE g\.id_grupo = \?/.test(sql)) return [rows.filter((group) => String(group.id) === String(params[0])), []];
    if (/headline_categoria AS headline/.test(sql)) return [categories, []];
    if (/AS totalGroups/.test(sql)) return [[{ totalGroups: rows.length, totalMembers: 2468 }], []];
    if (/AS totalCategories/.test(sql)) return [[{ totalCategories: categories.length }], []];
    if (/AS totalAccesses/.test(sql)) return [[{ totalAccesses: 30 }], []];
    if (/SELECT DISTINCT c\.id_categoria/.test(sql)) return [categories, []];
    if (/SELECT DISTINCT h\.nome_hashtag/.test(sql)) return [[{ name: 'teste' }], []];
    if (/g\.id_grupo AS id/.test(sql)) return [rows, []];
    throw new Error('Consulta não prevista no teste SSR.');
  });
  return { queries, network };
}

function pageRenderer(options = {}) {
  return createPageRenderer({ indexFile, cacheTemplate: false, renderBody: compiledRender, ...options });
}

async function requestPage(url, { renderer = pageRenderer(), userAgent = 'Mozilla/5.0' } = {}) {
  const response = { headers: {} };
  await renderer({ path: new URL(url, 'https://putarianotelegram.net').pathname, originalUrl: url, headers: { 'user-agent': userAgent } }, {
    setHeader(name, value) { response.headers[name] = value; },
    status(code) { response.status = code; return this; },
    type(value) { response.contentType = value; return this; },
    send(value) { response.html = value; },
    redirect(code, value) { response.status = code; response.location = value; },
  }, (error) => { throw error; });
  return response;
}

function bodyMarkup(html) {
  const match = html.match(/<div id="root" data-ssr="true">([\s\S]*)<\/div><script id="page-data"/);
  assert.ok(match, 'HTML contém a árvore pública renderizada antes do JavaScript');
  return match[1];
}

function pageData(html) {
  const match = html.match(/<script id="page-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'dados iniciais presentes e separados do HTML visível');
  return JSON.parse(match[1]);
}

realPageTest('HTML inicial da home e das categorias contém conteúdo e links existentes sem JavaScript', async () => {
  const { network } = mockPublicDatabase();
  const home = await requestPage('/');
  assert.equal(home.status, 200);
  const homeBody = bodyMarkup(home.html);
  assert.match(homeBody, /<h1>[\s\S]*?Putaria no Telegram:[\s\S]*?<\/h1>/);
  for (const groupPath of groupPaths) assert.ok(homeBody.includes(`href="${groupPath}"`), 'home descobre cada grupo por link real');
  const featuredCard = homeBody.match(/<article\b[^>]*class="group-card group-card-featured"[^>]*>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(featuredCard, 'a home renderiza o grupo em destaque');
  const featuredLinks = [...featuredCard.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  const internalLinks = featuredLinks.filter((link) => link[1].includes(`href="${groupPaths[0]}"`));
  assert.equal(internalLinks.length, 1, 'o destaque possui um link interno rastreável');
  assert.equal(internalLinks[0][2], groups[0].name, 'somente o nome do destaque compõe o link interno');
  assert.doesNotMatch(internalLinks[0][2], /<img\b|<p\b/);
  assert.ok(!internalLinks[0][2].includes(groups[0].description), 'a descrição continua fora do link interno');
  assert.ok(featuredCard.includes(`alt="Imagem do grupo ${groups[0].name}"`));
  assert.ok(featuredCard.includes(`<p>${groups[0].description}</p>`));
  const externalCta = featuredLinks.find((link) => link[2].startsWith('Acessar grupo '));
  assert.ok(externalCta?.[1].includes(`href="${groups[0].link}"`), 'o CTA do destaque mantém o destino externo original');
  assert.match(home.html, /<meta name="rating" content="adult"/);

  const categoryIndex = await requestPage('/categorias');
  assert.equal(categoryIndex.status, 200);
  for (const category of categories) assert.ok(bodyMarkup(categoryIndex.html).includes(`href="/categorias/${category.url}"`));

  const categoryPage = await requestPage('/categorias/categoria-alfa');
  assert.equal(categoryPage.status, 200);
  const categoryBody = bodyMarkup(categoryPage.html);
  assert.match(categoryBody, /<h1[^>]*>Título real da categoria Alfa<\/h1>/);
  assert.ok(categoryBody.includes(categories[0].subheadline));
  assert.ok(categoryBody.includes(`href="${groupPaths[0]}"`));
  assert.ok(categoryBody.includes(`href="${groupPaths[1]}"`));
  assert.ok(!categoryBody.includes(`href="${groupPaths[2]}"`), 'categoria não mostra grupos de outra categoria');
  assert.equal(network.mock.callCount(), 0);
});

realPageTest('três grupos têm h1, descrição, canonical e links próprios no HTML inicial', async () => {
  const { network } = mockPublicDatabase();
  const titles = new Set();
  for (const [index, groupPath] of groupPaths.entries()) {
    const response = await requestPage(groupPath);
    assert.equal(response.status, 200);
    const body = bodyMarkup(response.html);
    const group = groups[index];
    assert.ok(body.includes(`<h1>${group.name}</h1>`));
    assert.ok(body.includes(`<p class="group-details-description">${group.description}</p>`));
    assert.ok(body.includes(`href="/categorias/${group.categoryUrl}"`));
    assert.ok(body.includes('href="/#groups"'));
    assert.ok(response.html.includes(`<link rel="canonical" href="https://putarianotelegram.net${groupPath}"`));
    assert.doesNotMatch(body, /Carregando informações do grupo/);
    assert.equal(pageData(response.html).group.id, group.id);
    titles.add(response.html.match(/<title>(.*?)<\/title>/)[1]);
  }
  assert.equal(titles.size, 3);
  assert.equal(network.mock.callCount(), 0);
});

realPageTest('URLs inexistentes e grupos removidos apresentam 404 e conteúdo de erro sem redirecionar à home', async () => {
  mockPublicDatabase();
  for (const url of ['/pagina-inexistente', '/grupos/Removido-999']) {
    const response = await requestPage(url);
    assert.equal(response.status, 404);
    assert.equal(response.location, undefined);
    assert.match(bodyMarkup(response.html), /<h1[^>]*>Página não encontrada<\/h1>/);
    assert.match(response.html, /<meta name="robots" content="noindex, nofollow, noarchive"/);
    assert.equal(pageData(response.html).notFound, true);
  }
});

realPageTest('filtros por query são renderizados e não contaminam requisições seguintes', async () => {
  mockPublicDatabase();
  const [filtered, unfiltered] = await Promise.all([
    requestPage('/?categoria=categoria-beta'),
    requestPage('/'),
  ]);
  const filteredBody = bodyMarkup(filtered.html);
  assert.ok(filteredBody.includes(`href="${groupPaths[2]}"`));
  assert.ok(!filteredBody.includes(`href="${groupPaths[0]}"`));
  const allBody = bodyMarkup(unfiltered.html);
  for (const groupPath of groupPaths) assert.ok(allBody.includes(`href="${groupPath}"`));
});

realPageTest('visitantes e Googlebot recebem HTML idêntico', async () => {
  mockPublicDatabase();
  const human = await requestPage(groupPaths[0]);
  const bot = await requestPage(groupPaths[0], { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
  assert.equal(human.status, bot.status);
  assert.equal(human.html, bot.html);
});

realPageTest('descrições com fechamento de script permanecem texto no corpo e JSON seguro', async () => {
  const payload = '</script><script id="injetado">globalThis.injetado=true</script>\u2028\u2029';
  const hostile = { ...groups[0], description: `Texto cadastrado ${payload}` };
  mockPublicDatabase([hostile]);
  const response = await requestPage(groupPaths[0]);
  assert.equal(response.status, 200);
  assert.ok(bodyMarkup(response.html).includes('&lt;/script&gt;&lt;script id=&quot;injetado&quot;&gt;'));
  assert.doesNotMatch(response.html, /<script id="injetado">/);
  assert.ok(response.html.includes('\\u003c/script>'));
  assert.equal(pageData(response.html).group.description, hostile.description);
});

test('falhas da leitura de dados ou da árvore SSR retornam 503 temporário', async () => {
  for (const options of [
    { loadPageData: async () => { throw new Error('falha de dados simulada'); }, renderBody: () => '<main>não publicar</main>' },
    { loadPageData: async () => ({}), renderBody: () => { throw new Error('falha de React simulada'); } },
  ]) {
    const response = await requestPage('/', { renderer: pageRenderer(options) });
    assert.equal(response.status, 503);
    assert.equal(response.headers['Retry-After'], '120');
    assert.match(response.html, /<div id="root"><\/div>/);
    assert.doesNotMatch(response.html, /data-ssr|page-data|não publicar/);
  }
});

test('rotas administrativas não executam SSR nem expõem dados iniciais públicos', async () => {
  const renderBody = mock.fn(() => { throw new Error('SSR administrativo não permitido.'); });
  const loadPageData = mock.fn(async () => { throw new Error('Não carregar dados para administração.'); });
  for (const url of ['/dash', '/login', '/admin', '/admin/grupos']) {
    const response = await requestPage(url, { renderer: pageRenderer({ renderBody, loadPageData }) });
    assert.equal(response.status, 200);
    assert.match(response.html, /noindex/);
    assert.doesNotMatch(response.html, /data-ssr|page-data/);
  }
  assert.equal(renderBody.mock.callCount(), 0);
  assert.equal(loadPageData.mock.callCount(), 0);
});
