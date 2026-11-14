import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_SHARE_IMAGE, SITE_DESCRIPTION, SITE_NAME, siteUrl } from '../config/site';

type PageMetaProps = {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
  image?: string | null;
  imageAlt?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

const TITLE_MAX_LENGTH = 70;

// Corta no último espaço para não deixar palavras pela metade no resultado de busca.
function truncateAtWord(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : text.slice(0, maxLength)).replace(/[\s,.;:|–-]+$/, '');
}

// Mesma regra de fullTitle() do backend (seoRenderer.js): a marca só entra quando
// cabe inteira; títulos longos perdem a marca antes de perder palavras.
function buildTitle(title: string) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim() || SITE_NAME;
  if (cleanTitle.includes(SITE_NAME)) return truncateAtWord(cleanTitle, TITLE_MAX_LENGTH);
  const brandedTitle = `${cleanTitle} | ${SITE_NAME}`;
  return brandedTitle.length <= TITLE_MAX_LENGTH ? brandedTitle : truncateAtWord(cleanTitle, TITLE_MAX_LENGTH);
}

export default function PageMeta({
  title = SITE_NAME,
  description = SITE_DESCRIPTION,
  path,
  noIndex = false,
  type = 'website',
  image,
  imageAlt,
  structuredData,
}: PageMetaProps) {
  const location = useLocation();

  useEffect(() => {
    const cleanDescription = description.replace(/\s+/g, ' ').trim().slice(0, 160) || SITE_DESCRIPTION;
    const fullTitle = buildTitle(title);
    const canonicalUrl = siteUrl(path ?? location.pathname);
    // Páginas indexáveis sem imagem própria usam a imagem padrão no compartilhamento.
    const useDefaultImage = !image && !noIndex;
    const shareImage = image || (useDefaultImage ? DEFAULT_SHARE_IMAGE.path : '');
    const shareImageAlt = image ? imageAlt || fullTitle : DEFAULT_SHARE_IMAGE.alt;
    document.title = fullTitle;

    setMeta('meta[name="description"]', 'name', 'description', cleanDescription);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large');
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', cleanDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'pt_BR');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', cleanDescription);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', shareImage ? 'summary_large_image' : 'summary');

    const imageUrl = shareImage ? new URL(shareImage, canonicalUrl).toString() : '';
    const socialImageTags = [
      ['meta[property="og:image"]', 'property', 'og:image'],
      ['meta[property="og:image:alt"]', 'property', 'og:image:alt'],
      ['meta[name="twitter:image"]', 'name', 'twitter:image'],
      ['meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt'],
    ] as const;
    if (imageUrl) {
      setMeta(socialImageTags[0][0], socialImageTags[0][1], socialImageTags[0][2], imageUrl);
      setMeta(socialImageTags[1][0], socialImageTags[1][1], socialImageTags[1][2], shareImageAlt);
      setMeta(socialImageTags[2][0], socialImageTags[2][1], socialImageTags[2][2], imageUrl);
      setMeta(socialImageTags[3][0], socialImageTags[3][1], socialImageTags[3][2], shareImageAlt);
    } else {
      socialImageTags.forEach(([selector]) => document.head.querySelector(selector)?.remove());
    }
    // As dimensões só são conhecidas para a imagem padrão.
    if (useDefaultImage) {
      setMeta('meta[property="og:image:width"]', 'property', 'og:image:width', String(DEFAULT_SHARE_IMAGE.width));
      setMeta('meta[property="og:image:height"]', 'property', 'og:image:height', String(DEFAULT_SHARE_IMAGE.height));
    } else {
      document.head.querySelector('meta[property="og:image:width"]')?.remove();
      document.head.querySelector('meta[property="og:image:height"]')?.remove();
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    let jsonLd = document.head.querySelector<HTMLScriptElement>('script[data-page-structured-data]');
    if (structuredData) {
      if (!jsonLd) {
        jsonLd = document.createElement('script');
        jsonLd.type = 'application/ld+json';
        jsonLd.dataset.pageStructuredData = 'true';
        document.head.appendChild(jsonLd);
      }
      const graph = Array.isArray(structuredData) ? structuredData : [structuredData];
      jsonLd.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
    } else {
      jsonLd?.remove();
    }
  }, [description, image, imageAlt, location.pathname, noIndex, path, structuredData, title, type]);

  return null;
}
