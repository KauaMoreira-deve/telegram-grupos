import { createContext, useContext } from 'react';

export type PublicGroup = {
  id: number;
  name: string;
  category: string;
  categoryUrl: string;
  description: string;
  image: string | null;
  link: string;
  featured: boolean;
  members: number | null;
  accesses: number;
  likes: number;
  createdAt: string | null;
  createdAtIso: string | null;
  membersUpdatedAt: string | null;
  hashtags: string[];
};

export type PublicCategory = { id: number; name: string; url: string; headline?: string | null; subheadline?: string | null; groupCount?: number };
export type PublicStats = { totalGroups: number; totalMembers: number; totalCategories: number; totalAccesses: number };
export type FooterCatalog = { categories: PublicCategory[]; hashtags: string[] };

// Cada requisição fornece seu próprio contexto; nenhum dado de visitante fica em estado global.
export type PublicPageData = {
  pathname?: string;
  groups?: PublicGroup[];
  categories?: PublicCategory[];
  stats?: PublicStats;
  footerCatalog?: FooterCatalog;
  group?: PublicGroup | null;
  notFound?: boolean;
};

export const PublicPageDataContext = createContext<PublicPageData>({});

export function usePublicPageData() {
  return useContext(PublicPageDataContext);
}
