import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '../config/site';

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
    const cleanTitle = title.replace(/\s+/g, ' ').trim() || SITE_NAME;
    const cleanDescription = description.replace(/\s+/g, ' ').trim().slice(0, 160) || SITE_DESCRIPTION;
    const hasBrand = cleanTitle === SITE_NAME || cleanTitle.includes(SITE_NAME);
    const titleSuffix = ` | ${SITE_NAME}`;
    const brandedTitle = hasBrand ? cleanTitle : `${cleanTitle}${titleSuffix}`;
    const fullTitle = brandedTitle.length <= 70
      ? brandedTitle
      : hasBrand
        ? brandedTitle.slice(0, 70).trim()
        : `${cleanTitle.slice(0, 70 - titleSuffix.length).trim()}${titleSuffix}`;
    const canonicalUrl = siteUrl(path ?? location.pathname);
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
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');

    const imageUrl = image ? new URL(image, canonicalUrl).toString() : '';
    const socialImageTags = [
      ['meta[property="og:image"]', 'property', 'og:image'],
      ['meta[property="og:image:alt"]', 'property', 'og:image:alt'],
      ['meta[name="twitter:image"]', 'name', 'twitter:image'],
      ['meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt'],
    ] as const;
    if (imageUrl) {
      setMeta(socialImageTags[0][0], socialImageTags[0][1], socialImageTags[0][2], imageUrl);
      setMeta(socialImageTags[1][0], socialImageTags[1][1], socialImageTags[1][2], imageAlt || fullTitle);
      setMeta(socialImageTags[2][0], socialImageTags[2][1], socialImageTags[2][2], imageUrl);
      setMeta(socialImageTags[3][0], socialImageTags[3][1], socialImageTags[3][2], imageAlt || fullTitle);
    } else {
      socialImageTags.forEach(([selector]) => document.head.querySelector(selector)?.remove());
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
