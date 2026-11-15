import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import type { PublicPageData } from './PublicPageData'

const root = document.getElementById('root')!;
const pageData = document.getElementById('page-data');
const initialData = pageData?.textContent ? JSON.parse(pageData.textContent) as PublicPageData : undefined;
const app = (
  <StrictMode>
    <App initialData={initialData} />
  </StrictMode>
);

if (pageData && root.dataset.ssr === 'true') hydrateRoot(root, app);
else createRoot(root).render(app);
