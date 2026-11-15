import { readFile } from 'node:fs/promises';
import { findPublicGroup, loadFooterCatalog, loadPublicCategories, loadPublicGroups, loadPublicStats } from '../controllers/publicController.js';

// Gera as meta tags de cada rota no próprio HTML entregue pelo servidor.
// Sem isso, buscadores e redes sociais recebiam o título, a descrição e o
// canonical da página inicial em todas as URLs (ex.: /grupos/nome-36).
const SITE_NAME = 'Putaria no Telegram';
const SITE_URL = 'https://putarianotelegram.net';
const SITE_HOST = new URL(SITE_URL).hostname;
// Mantidos em sincronia com frontend/src/config/site.ts.
const SITE_DESCRIPTION = 'Grupos de putaria e canais adultos no Telegram (+18) com links ativos e verificação automática. Amadoras, casais, gays e mais: grátis e sem cadastro.';
const HOME_TITLE = 'Grupos de Putaria no Telegram +18: links ativos e verificados';
// Imagem de compartilhamento padrão (cópia estável de src/assets/imagem-grupos.webp).
const DEFAULT_IMAGE = { url: `${SITE_URL}/og-image.webp`, width: 800, height: 450, alt: 'Grupos de putaria no Telegram +18' };
const TITLE_MAX_LENGTH = 70;

let templateCache = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function siteUrl(path = '/') {
  const url = new URL(SITE_URL);
  url.pathname = path.startsWith('/') ? path : `/${path}`;
  return url.toString();
}

function slugifyGroupName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'grupo';
}

function groupPath(group) {
  return `/grupos/${slugifyGroupName(group.name)}-${group.id}`;
}

// Corta no último espaço para não deixar palavras pela metade no resultado de busca.
function truncateAtWord(text, maxLength) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : text.slice(0, maxLength)).replace(/[\s,.;:|–-]+$/, '');
}

// Mesma regra do componente PageMeta do frontend: a marca só entra quando cabe
// inteira; títulos longos perdem a marca antes de perder palavras.
export function fullTitle(title) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim() || SITE_NAME;
  if (cleanTitle.includes(SITE_NAME)) return truncateAtWord(cleanTitle, TITLE_MAX_LENGTH);
  const branded = `${cleanTitle} | ${SITE_NAME}`;
  return branded.length <= TITLE_MAX_LENGTH ? branded : truncateAtWord(cleanTitle, TITLE_MAX_LENGTH);
}

function cleanDescription(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 160) || SITE_DESCRIPTION;
}

// Mantida em sincronia com groupMetaDescription() do frontend.
export function groupMetaDescription(group) {
  const description = String(group.description || '').replace(/\s+/g, ' ').trim();
  const complement = `Grupo +18 de ${group.category} no Telegram com link ativo.`;
  const text = description.length < 90 ? `${description} ${complement}`.trim() : description;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 159);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 100 ? cut.lastIndexOf(' ') : 159).trim()}…`;
}

function categoryTitle(category) {
  return category.headline?.trim() || `Grupos de ${category.name} no Telegram +18`;
}

// Mantida em sincronia com categoryMetaDescription() do frontend. A subheadline
// escrita no painel tem prioridade; sem ela, a descrição usa o total de grupos
// para não repetir o mesmo texto em todas as categorias.
export function categoryDescription(category) {
  const subheadline = category.subheadline?.trim();
  if (subheadline) return subheadline;
  const count = Number(category.groupCount) || 0;
  const groups = count === 1 ? `1 grupo de ${category.name}` : count > 1 ? `${count} grupos de ${category.name}` : `Grupos de ${category.name}`;
  const links = count === 1 ? 'com link ativo e verificado' : 'com links ativos e verificados';
  return `${groups} no Telegram (+18) ${links}. Veja descrição e número de membros e entre grátis, sem cadastro.`;
}

async function loadTemplate(indexFile, cacheTemplate) {
  if (cacheTemplate && templateCache) return templateCache;
  const html = await readFile(indexFile, 'utf8');
  // Remove as tags padrão; elas são recriadas para cada rota.
  const template = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="(?:description|robots)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:(?:title|description|url|type|image(?::alt|:width|:height)?)"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:(?:card|title|description|image|image:alt)"[^>]*>\s*/gi, '')
    .replace(/<script[^>]*data-page-structured-data[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  if (cacheTemplate) templateCache = template;
  return template;
}

function renderHead(meta) {
  const title = fullTitle(meta.title);
  const description = cleanDescription(meta.description);
  const canonical = siteUrl(meta.path || '/');
  const ownImage = meta.image && /^https:\/\//i.test(meta.image) ? meta.image : '';
  // Páginas indexáveis sem imagem própria usam a imagem padrão no compartilhamento.
  const defaultImage = !ownImage && !meta.noIndex ? DEFAULT_IMAGE : null;
  const image = ownImage || defaultImage?.url || '';
  const imageAlt = ownImage ? meta.imageAlt || title : defaultImage?.alt;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${meta.noIndex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large'}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${meta.type || 'website'}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  ];
  if (image) {
    tags.push(
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
      `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    );
  }
  if (defaultImage) {
    tags.push(
      `<meta property="og:image:width" content="${defaultImage.width}" />`,
      `<meta property="og:image:height" content="${defaultImage.height}" />`,
    );
  }
  if (meta.structuredData) {
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': meta.structuredData }).replace(/</g, '\\u003c');
    tags.push(`<script data-page-structured-data="true" type="application/ld+json">${json}</script>`);
  }
  return tags.map((tag) => `    ${tag}`).join('\n');
}

const websiteNode = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: 'PutariaNoTelegram',
  url: `${SITE_URL}/`,
  inLanguage: 'pt-BR',
};

// Textos mantidos em sincronia com AddGroupPage, TermsOfUsePage e CategoriesPage do frontend.
const ADD_GROUP_META = {
  title: 'Adicione seu grupo +18 do Telegram grátis',
  description: 'Divulgue grátis seu grupo ou canal adulto do Telegram: envie o link público e a descrição para análise. Após a aprovação, ele aparece no diretório.',
};
const TERMS_DESCRIPTION = `Termos de uso do ${SITE_NAME}: requisito de idade (18+), responsabilidade pelo conteúdo dos grupos, envio de grupos e links externos.`;
const CATEGORIES_DESCRIPTION = 'Escolha uma categoria e encontre grupos de putaria no Telegram com links ativos: amadores, casais, gays, lésbicas, hentai, fetiches e muito mais.';

// Páginas institucionais do menu; mantidas em sincronia com AboutPage, HowToJoinPage e FaqPage do frontend.
// `breadcrumb` é o mesmo rótulo exibido na trilha de navegação visível da página.
const infoPages = {
  '/sobre': {
    title: 'Sobre o Putaria no Telegram',
    breadcrumb: 'Sobre',
    description: 'Conheça o Putaria no Telegram: diretório gratuito de grupos adultos e canais +18 do Telegram, com links verificados e organizados por categoria.',
  },
  '/como-entrar-em-grupos-telegram': {
    title: 'Como entrar em grupos de putaria no Telegram',
    breadcrumb: 'Como entrar',
    description: 'Passo a passo para entrar em grupos de putaria no Telegram: escolha a categoria, veja os detalhes e entre grátis, sem cadastro.',
  },
  '/perguntas-frequentes': {
    title: 'Perguntas frequentes sobre grupos +18',
    breadcrumb: 'Perguntas frequentes',
    description: 'Respostas sobre grupos de putaria no Telegram: como entrar, se os links são verificados, se é grátis, grupo ou canal e como divulgar seu grupo.',
  },
};

/**
 * Resolve as metas da rota. Pode devolver { redirect } para URLs com slug antigo.
 */
async function resolveMeta(pathname) {
  const notFound = { status: 404, meta: { title: 'Página não encontrada', description: 'A página solicitada não existe ou foi removida.', path: pathname, noIndex: true } };

  if (pathname === '/') {
    return { status: 200, meta: { title: HOME_TITLE, description: SITE_DESCRIPTION, path: '/', structuredData: [websiteNode] } };
  }
  if (pathname === '/adicionar-grupo') {
    return { status: 200, meta: { title: ADD_GROUP_META.title, description: ADD_GROUP_META.description, path: pathname } };
  }
  if (pathname === '/termos-de-uso') {
    return { status: 200, meta: { title: 'Termos de uso', description: TERMS_DESCRIPTION, path: pathname } };
  }
  const infoPage = infoPages[pathname];
  if (infoPage) {
    return {
      status: 200,
      meta: {
        title: infoPage.title,
        description: infoPage.description,
        path: pathname,
        structuredData: [
          websiteNode,
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: siteUrl('/') },
              { '@type': 'ListItem', position: 2, name: infoPage.breadcrumb, item: siteUrl(pathname) },
            ],
          },
        ],
      },
    };
  }
  if (pathname === '/dash' || pathname === '/login' || pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { status: 200, meta: { title: 'Administração', description: 'Área administrativa.', path: pathname, noIndex: true } };
  }
  if (pathname === '/categorias' || pathname === '/categorias/') {
    return {
      status: 200,
      meta: {
        title: 'Categorias de grupos +18 no Telegram',
        description: CATEGORIES_DESCRIPTION,
        path: '/categorias',
        structuredData: [websiteNode],
      },
    };
  }

  const categoryMatch = pathname.match(/^\/categorias\/([^/]+)\/?$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const category = (await loadPublicCategories()).find((item) => item.url === slug);
    if (!category) return notFound;
    const path = `/categorias/${encodeURIComponent(category.url)}`;
    return {
      status: 200,
      meta: {
        title: categoryTitle(category),
        description: categoryDescription(category),
        path,
        structuredData: [
          websiteNode,
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: siteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'Categorias', item: siteUrl('/categorias') },
              { '@type': 'ListItem', position: 3, name: category.name, item: siteUrl(path) },
            ],
          },
        ],
      },
    };
  }

  const groupMatch = pathname.match(/^\/grupos\/([^/]+)\/?$/);
  if (groupMatch) {
    const groupId = decodeURIComponent(groupMatch[1]).match(/(?:^|-)(\d{1,19})$/)?.[1];
    const group = groupId ? await findPublicGroup(groupId) : null;
    if (!group) return notFound;
    const path = groupPath(group);
    if (pathname !== path) return { redirect: path };
    const pageUrl = siteUrl(path);
    const title = `${group.name}: grupo +18 no Telegram`;
    const description = groupMetaDescription(group);
    return {
      status: 200,
      group,
      meta: {
        title,
        description,
        path,
        type: 'article',
        image: group.image,
        imageAlt: `Imagem do grupo adulto ${group.name} no Telegram`,
        structuredData: [
          websiteNode,
          {
            '@type': 'WebPage',
            '@id': `${pageUrl}#webpage`,
            url: pageUrl,
            name: title,
            description,
            inLanguage: 'pt-BR',
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@type': 'Thing', name: `Grupo adulto de ${group.category} no Telegram` },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: siteUrl('/') },
              { '@type': 'ListItem', position: 2, name: group.category, item: siteUrl(`/categorias/${encodeURIComponent(group.categoryUrl)}`) },
              { '@type': 'ListItem', position: 3, name: group.name, item: pageUrl },
            ],
          },
        ],
      },
    };
  }

  return notFound;
}

/**
 * Redireciona (301) para a URL canônica: www → domínio principal, barra final
 * removida e /index.html → /. Evita que o mesmo conteúdo responda 200 em vários
 * endereços. A API só é afetada pelo redirecionamento do www.
 */
export function canonicalRedirect(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const isWwwHost = req.hostname === `www.${SITE_HOST}`;
  const isApi = req.path === '/api' || req.path.startsWith('/api/');
  let pathname = req.path;
  if (!isApi) {
    if (pathname === '/index.html') pathname = '/';
    else if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.replace(/\/+$/, '') || '/';
  }
  if (!isWwwHost && pathname === req.path) return next();

  // Barras ou contrabarras iniciais repetidas virariam um endereço de outro domínio.
  const safePath = `/${pathname.replace(/^[/\\]+/, '')}`;
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  return res.redirect(301, `${isWwwHost ? SITE_URL : ''}${safePath}${query}`);
}

/**
 * Entrega metadados específicos e, quando configurado, o corpo React da rota.
 */
export function createPageRenderer({ indexFile, cacheTemplate = true, renderBody, loadPageData = loadPublicPageData }) {
  return async (req, res, next) => {
    try {
      let resolved;
      try {
        resolved = await resolveMeta(req.path);
      } catch (error) {
        if (error instanceof URIError) {
          resolved = { status: 400, meta: { title: 'Página não encontrada', description: 'A página solicitada não existe ou foi removida.', path: req.path, noIndex: true } };
        } else {
          // O cliente pode tentar novamente, mas o 503 evita confirmar conteúdo genérico.
          console.error('Falha ao gerar metas da página.', { code: error.code, name: error.name });
          resolved = { status: 503, retryAfterSeconds: 120, meta: { title: SITE_NAME, description: SITE_DESCRIPTION, path: req.path } };
        }
      }

      if (resolved.redirect) {
        const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
        return res.redirect(301, `${resolved.redirect}${query}`);
      }

      const template = await loadTemplate(indexFile, cacheTemplate);
      let html = template;
      // O mesmo React e os mesmos dados públicos são entregues a todos os visitantes.
      // Áreas administrativas continuam no cliente e nunca entram nos dados iniciais.
      if (renderBody && resolved.status !== 503 && !isAdministrativePath(req.path)) {
        try {
          const data = await loadPageData(req.path, resolved);
          const markup = await renderBody(req.originalUrl, data);
          const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
          html = html.replace('<div id="root"></div>', () => `<div id="root" data-ssr="true">${markup}</div><script id="page-data" type="application/json">${json}</script>`);
        } catch (error) {
          // Não confirma HTTP 200 se a renderização ou a leitura dos dados falhar.
          console.error('Falha ao renderizar a página.', { code: error.code, name: error.name });
          resolved = { status: 503, retryAfterSeconds: 120, meta: { title: SITE_NAME, description: SITE_DESCRIPTION, path: req.path } };
          html = template;
        }
      }
      html = html.replace('</head>', () => `${renderHead(resolved.meta)}\n  </head>`);
      res.setHeader('Cache-Control', 'no-cache');
      if (resolved.retryAfterSeconds) res.setHeader('Retry-After', String(resolved.retryAfterSeconds));
      res.status(resolved.status).type('html').send(html);
    } catch (error) {
      next(error);
    }
  };
}

function isAdministrativePath(pathname) {
  return pathname === '/dash' || pathname === '/login' || pathname === '/admin' || pathname.startsWith('/admin/');
}

export async function loadPublicPageData(pathname, resolved) {
  const notFound = resolved.status === 404 || resolved.status === 400;
  const [groups, categories, stats, footerCatalog] = await Promise.all([
    notFound ? [] : loadPublicGroups({ refreshMembers: false }),
    loadPublicCategories(),
    !notFound && (pathname === '/' || pathname.startsWith('/categorias/')) ? loadPublicStats() : undefined,
    loadFooterCatalog(),
  ]);
  return { pathname, groups, categories, stats, footerCatalog, group: resolved.group || null, notFound };
}
