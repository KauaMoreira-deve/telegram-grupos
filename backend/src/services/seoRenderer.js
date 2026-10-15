import { readFile } from 'node:fs/promises';
import { findPublicGroup, loadPublicCategories } from '../controllers/publicController.js';

// Gera as meta tags de cada rota no próprio HTML entregue pelo servidor.
// Sem isso, buscadores e redes sociais recebiam o título, a descrição e o
// canonical da página inicial em todas as URLs (ex.: /grupos/nome-36).
const SITE_NAME = 'Putaria no Telegram';
const SITE_URL = 'https://putarianotelegram.net';
const SITE_DESCRIPTION = 'Encontre grupos adultos e canais +18 no Telegram com links ativos, categorias variadas e acesso gratuito. Conteúdo exclusivo para maiores de 18 anos.';
const HOME_TITLE = 'Grupos adultos no Telegram (+18): links ativos';

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

// Mesma regra do componente PageMeta do frontend.
function fullTitle(title) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim() || SITE_NAME;
  const hasBrand = cleanTitle === SITE_NAME || cleanTitle.includes(SITE_NAME);
  const suffix = ` | ${SITE_NAME}`;
  const branded = hasBrand ? cleanTitle : `${cleanTitle}${suffix}`;
  if (branded.length <= 70) return branded;
  return hasBrand ? branded.slice(0, 70).trim() : `${cleanTitle.slice(0, 70 - suffix.length).trim()}${suffix}`;
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

function categoryDescription(category) {
  return category.subheadline?.trim()
    || `Veja grupos de ${category.name} no Telegram para maiores de 18 anos. Encontre links ativos, descrições e comunidades adultas da categoria.`;
}

async function loadTemplate(indexFile, cacheTemplate) {
  if (cacheTemplate && templateCache) return templateCache;
  const html = await readFile(indexFile, 'utf8');
  // Remove as tags padrão; elas são recriadas para cada rota.
  const template = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="(?:description|robots)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:(?:title|description|url|type|image|image:alt)"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:(?:card|title|description|image|image:alt)"[^>]*>\s*/gi, '')
    .replace(/<script[^>]*data-page-structured-data[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  if (cacheTemplate) templateCache = template;
  return template;
}

function renderHead(meta) {
  const title = fullTitle(meta.title);
  const description = cleanDescription(meta.description);
  const canonical = siteUrl(meta.path || '/');
  const image = meta.image && /^https:\/\//i.test(meta.image) ? meta.image : '';
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
      `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt || title)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
      `<meta name="twitter:image:alt" content="${escapeHtml(meta.imageAlt || title)}" />`,
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
  alternateName: 'Grupos adultos no Telegram',
  url: `${SITE_URL}/`,
  inLanguage: 'pt-BR',
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
    return { status: 200, meta: { title: 'Adicionar grupo', description: `Envie seu grupo para análise no ${SITE_NAME}.`, path: pathname } };
  }
  if (pathname === '/termos-de-uso') {
    return { status: 200, meta: { title: 'Termos de uso', description: `Termos de uso do ${SITE_NAME}.`, path: pathname } };
  }
  if (pathname === '/dash' || pathname === '/login' || pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { status: 200, meta: { title: 'Administração', description: 'Área administrativa.', path: pathname, noIndex: true } };
  }
  if (pathname === '/categorias' || pathname === '/categorias/') {
    return {
      status: 200,
      meta: {
        title: 'Categorias de grupos +18 no Telegram',
        description: 'Escolha uma categoria e encontre grupos adultos do Telegram com links ativos: amadoras, casais, novinhas, gays e muito mais.',
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
    const groupId = decodeURIComponent(groupMatch[1]).match(/(?:^|-)(\d{1,18})$/)?.[1];
    const group = groupId ? await findPublicGroup(groupId) : null;
    if (!group) return notFound;
    const path = groupPath(group);
    if (pathname !== path) return { redirect: path };
    const pageUrl = siteUrl(path);
    const title = `${group.name}: grupo +18 no Telegram`;
    const description = groupMetaDescription(group);
    return {
      status: 200,
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
 * Middleware que entrega o index.html do frontend com as metas corretas da rota.
 */
export function createPageRenderer({ indexFile, cacheTemplate = true }) {
  return async (req, res, next) => {
    try {
      let resolved;
      try {
        resolved = await resolveMeta(req.path);
      } catch (error) {
        // Falha no banco não pode derrubar a página: entrega metas genéricas da própria URL.
        console.error('Falha ao gerar metas da página.', { code: error.code, name: error.name });
        resolved = { status: 200, meta: { title: SITE_NAME, description: SITE_DESCRIPTION, path: req.path } };
      }

      if (resolved.redirect) {
        const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
        return res.redirect(301, `${resolved.redirect}${query}`);
      }

      const template = await loadTemplate(indexFile, cacheTemplate);
      const html = template.replace('</head>', `${renderHead(resolved.meta)}\n  </head>`);
      res.setHeader('Cache-Control', 'no-cache');
      res.status(resolved.status).type('html').send(html);
    } catch (error) {
      next(error);
    }
  };
}
