import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { PublicPageDataContext } from './PublicPageData';
import type { PublicPageData } from './PublicPageData';

// Usa a mesma árvore do navegador para preservar textos, marcação e componentes.
export function renderPage(url: string, data: PublicPageData = {}) {
  return renderToString(
    <PublicPageDataContext value={data}>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </PublicPageDataContext>,
  );
}
