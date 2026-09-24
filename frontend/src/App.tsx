import './App.css'
import Cards from './components/Cards'
import Button from './components/btn'
import imagemGrupos from './assets/imagem-gruou-black.png'
import telegramLogo from './assets/telegram.png'
import safetyPoster from './assets/_image.webp'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, Clock3, Eye, Link2, Menu, MessageCircle, Search, Send, Share2, SlidersHorizontal, ThumbsUp, Users, X } from 'lucide-react'
import Login from './pages/Login/Login'
import RequireAdmin from './components/RequireAdmin'
import DashboardLayout from './pages/Dashboard/DashboardLayout'
import DashboardHome from './pages/Dashboard/DashboardHome'
import DashboardGroups from './pages/Dashboard/DashboardGroups'
import DashboardGroupForm from './pages/Dashboard/DashboardGroupForm'
import DashboardCategories from './pages/Dashboard/DashboardCategories'
import DashboardUsers from './pages/Dashboard/DashboardUsers'
import DashboardSettings from './pages/Dashboard/DashboardSettings'
import DashboardSubmissions from './pages/Dashboard/DashboardSubmissions'
import { apiUrl } from './config/api'
import PageMeta from './components/PageMeta'
import { HOME_TITLE, SITE_DESCRIPTION, SITE_NAME, safeImageUrl, safeTelegramUrl, siteUrl } from './config/site'


type PublicGroup = {
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

type PublicCategory = { id: number; name: string; url: string };
type PublicStats = { totalGroups: number; totalMembers: number; totalCategories: number; totalAccesses: number };
type FooterCatalog = { categories: PublicCategory[]; hashtags: string[] };
type SubmissionForm = { nome_grupo: string; id_categoria: string; descricao_grupo: string; link_telegram: string; nome_contato: string; email_contato: string };
type SortMode = 'recentes' | 'votados' | 'membros' | 'acessados';

const formatCount = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

function formatMonthYear(value: string | null) {
  if (!value) return '';
  const brazilianDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const isoDate = value.match(/^(\d{4})-(\d{2})/);
  const year = brazilianDate?.[3] || isoDate?.[1];
  const month = brazilianDate?.[2] || isoDate?.[2];
  if (!year || !month) return '';
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}
const emptySubmissionForm: SubmissionForm = { nome_grupo: '', id_categoria: '', descricao_grupo: '', link_telegram: '', nome_contato: '', email_contato: '' };
const groupsPerPage = 30;
const telegramFolderUrl = 'https://t.me/addlist/O1xBNBhDJto2ODYx';
const telegramFolderGateKey = 'telegram-folder-opened';
let telegramFolderOpenedFallback = false;
let visitorIdFallback = '';

function hasOpenedTelegramFolder() {
  try {
    return sessionStorage.getItem(telegramFolderGateKey) === 'true';
  } catch {
    return telegramFolderOpenedFallback;
  }
}

function markTelegramFolderAsOpened() {
  telegramFolderOpenedFallback = true;
  try {
    sessionStorage.setItem(telegramFolderGateKey, 'true');
  } catch {
    // O estado em memória mantém o fluxo quando o armazenamento está indisponível.
  }
}

function handleTelegramGroupLink(event: React.MouseEvent<HTMLAnchorElement>, groupLink: string, onGroupAccess: () => void) {
  const canOpenGroup = hasOpenedTelegramFolder();
  const safeGroupLink = safeTelegramUrl(groupLink);
  event.currentTarget.href = canOpenGroup && safeGroupLink ? safeGroupLink : telegramFolderUrl;
  if (canOpenGroup && safeGroupLink) onGroupAccess();
  else markTelegramFolderAsOpened();
}

const sortOptions: { value: SortMode; label: string; description: string; icon: typeof Clock3 }[] = [
  { value: 'recentes', label: 'Mais recentes', description: 'Cadastrados por último', icon: Clock3 },
  { value: 'votados', label: 'Mais votados', description: 'Mais curtidos pela comunidade', icon: ThumbsUp },
  { value: 'membros', label: 'Mais membros', description: 'Maiores comunidades', icon: Users },
  { value: 'acessados', label: 'Mais acessados', description: 'Links mais visitados', icon: Eye },
];

function getVisitorId() {
  const storageKey = 'telegram-groups-visitor-id';
  try {
    const storedId = localStorage.getItem(storageKey);
    if (storedId) return storedId;
    const visitorId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, visitorId);
    return visitorId;
  } catch {
    if (!visitorIdFallback) visitorIdFallback = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return visitorIdFallback;
  }
}

function normalizePublicGroup(group: PublicGroup): PublicGroup {
  return {
    ...group,
    id: Number(group.id),
    members: group.members === null || group.members === undefined ? null : Number(group.members),
    accesses: Number(group.accesses) || 0,
    likes: Number(group.likes) || 0,
    hashtags: Array.isArray(group.hashtags) ? group.hashtags : [],
    image: safeImageUrl(group.image),
    link: safeTelegramUrl(group.link) || telegramFolderUrl,
  };
}

function groupPath(group: Pick<PublicGroup, 'id' | 'name'>) {
  const nameSlug = group.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'grupo';
  return `/grupos/${nameSlug}-${group.id}`;
}

const faqItems = [
  {
    question: 'O que é o Putaria no Telegram?',
    answer: 'Putaria no Telegram é um diretório gratuito de grupos adultos e canais +18 do Telegram. As comunidades são organizadas por categoria e apresentam descrição, número de membros e link de acesso para você escolher antes de abrir o aplicativo.',
  },
  {
    question: 'Os links dos grupos são verificados?',
    answer: 'Sim. Um verificador automático testa os convites periodicamente e remove da lista os grupos que caíram ou expiraram. Assim você evita link morto e entra só no que está ativo.',
  },
  {
    question: 'Como entrar em um grupo de putaria no Telegram?',
    answer: 'Basta clicar no card do grupo desejado, ler a descrição e tocar no botão "Entrar no grupo". Você será redirecionado para o Telegram para participar gratuitamente, sem cadastro.',
  },
  {
    question: 'Os grupos de pornô no Telegram são gratuitos?',
    answer: 'A entrada nos grupos de conteúdo adulto listados é gratuita. Cada comunidade pode ter regras próprias ou oferecer conteúdo opcional, por isso consulte a descrição e as orientações dos administradores.',
  },
  {
    question: 'Qual a diferença entre grupo e canal de putaria no Telegram?',
    answer: 'No grupo todos os membros conversam e postam (veja o chat de putaria). No canal, só os administradores publicam e você acompanha o conteúdo. Listamos os dois formatos, sempre +18.',
  },
  {
    question: 'Como divulgar meu grupo adulto do Telegram?',
    answer: 'Clique em "Adicionar grupo", preencha o formulário com o link e a descrição e envie para análise. Após a aprovação, a comunidade poderá aparecer no diretório e na lista de grupos atualizados.',
  },
];

function AgeNotice() {
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem('age-notice-confirmed') !== 'true');

  function confirmAge() {
    sessionStorage.setItem('age-notice-confirmed', 'true');
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className="age-notice-backdrop" role="presentation">
      <section aria-labelledby="age-notice-title" aria-modal="true" className="age-notice" role="dialog">
        <span className="age-notice-badge">18+</span>
        <h2 id="age-notice-title">Conteúdo destinado a maiores de idade</h2>
        <p>Este site é destinado exclusivamente a pessoas com 18 anos ou mais. Ao continuar, você confirma que atende a esse requisito.</p>
        <button onClick={confirmAge} type="button">Tenho 18 anos ou mais</button>
      </section>
    </div>
  );
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const navigation = (
    <ul className="topo-cont">
      <li><a href="/#home" onClick={() => setMenuOpen(false)}>Inicio</a></li>
      <li><a href="/#groups" onClick={() => setMenuOpen(false)}>Grupos</a></li>
      <li><Link to="/adicionar-grupo" onClick={() => setMenuOpen(false)}>Adicionar grupo</Link></li>
      <li><a href="/#faq" onClick={() => setMenuOpen(false)}>FAQ</a></li>
      <li><Link to="/termos-de-uso" onClick={() => setMenuOpen(false)}>Termos de uso</Link></li>
      <li><Button href="/adicionar-grupo">Adicione seu grupo</Button></li>
    </ul>
  );

  return (
    <header className="site-header">
      <div className="topo">
        <Link aria-label={`${SITE_NAME} - início`} className="site-logo" to="/">
          <span aria-hidden="true" className="site-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
          </span>
          <span className="site-logo-text">PutariaNo<span className="site-logo-accent">Telegram</span></span>
        </Link>
        <nav aria-label="Navegacao principal" className="desktop-navigation">{navigation}</nav>
        <Link className="mobile-header-submit" to="/adicionar-grupo">+ Enviar</Link>
        <button aria-controls="mobile-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} className="site-menu-button" onClick={() => setMenuOpen((open) => !open)} type="button">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {menuOpen && <button aria-label="Fechar menu" className="site-menu-overlay" onClick={() => setMenuOpen(false)} type="button" />}
      <aside aria-label="Menu de navegacao" className={`site-mobile-menu ${menuOpen ? 'is-open' : ''}`} id="mobile-navigation">
        <div className="site-mobile-menu-header"><span>Menu</span><button aria-label="Fechar menu" onClick={() => setMenuOpen(false)} type="button"><X size={22} /></button></div>
        <nav>{navigation}</nav>
      </aside>
    </header>
  );
}

function SiteFooter() {
  const [catalog, setCatalog] = useState<FooterCatalog>({ categories: [], hashtags: [] });

  useEffect(() => {
    async function fetchFooterCatalog() {
      try {
        const response = await fetch(apiUrl('/api/public/footer-catalog'));
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Catálogo do rodapé indisponível.');
        setCatalog(data);
      } catch (error) {
        try {
          const [categoriesResponse, groupsResponse] = await Promise.all([
            fetch(apiUrl('/api/public/categories')),
            fetch(apiUrl('/api/public/groups')),
          ]);
          const [categories, groups] = await Promise.all([categoriesResponse.json(), groupsResponse.json()]);
          if (!categoriesResponse.ok || !groupsResponse.ok) throw error;

          const hashtags = Array.from(new Set(
            (groups as PublicGroup[]).flatMap((group) => group.hashtags || []),
          )).sort((first, second) => first.localeCompare(second, 'pt-BR'));
          setCatalog({ categories, hashtags });
        } catch (fallbackError) {
          console.error('Erro ao buscar categorias e hashtags do rodapé:', fallbackError);
        }
      }
    }
    void fetchFooterCatalog();
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div>
          <Link className="footer-logo" to="/"><img src={telegramLogo} alt="" /> Putaria no <span className="gradient-roxo">Telegram</span></Link>
          <p>Diretório de grupos adultos e canais +18 do Telegram, organizados por categoria.</p>
        </div>
        <div className="footer-links">
          <span>Links rápidos</span>
          <a href="/#home">Início</a>
          <a href="/#groups">Grupos</a>
          <Link to="/adicionar-grupo">Adicionar grupo</Link>
          <a href="/#faq">Perguntas frequentes</a>
          <Link to="/termos-de-uso">Termos de uso</Link>
        </div>
        <div className="footer-links footer-catalog">
          <span>Categorias</span>
          {catalog.categories.length ? catalog.categories.map((category) => <Link key={category.id} to={`/categorias/${encodeURIComponent(category.url)}`}>{category.name}</Link>) : <small>Nenhuma categoria disponível.</small>}
        </div>
        <div className="footer-links footer-catalog">
          <span>Hashtags</span>
          {catalog.hashtags.length ? catalog.hashtags.map((hashtag) => <a href={`/?hashtag=${encodeURIComponent(hashtag)}#groups`} key={hashtag}>#{hashtag}</a>) : <small>Nenhuma hashtag disponível.</small>}
        </div>
        <div className="footer-adult-notice">
          <strong>Conteúdo +18</strong>
          <p>Esta plataforma é destinada exclusivamente a pessoas maiores de 18 anos.</p>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} {SITE_NAME}. Todos os direitos reservados.</div>
    </footer>
  );
}

function TermsOfUsePage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="legal-page">
      <PageMeta description={`Termos de uso do ${SITE_NAME}.`} path="/termos-de-uso" title="Termos de uso" />
      <article aria-labelledby="terms-title" className="legal-content">
        <span className="legal-eyebrow">INFORMAÇÕES LEGAIS</span>
        <h1 id="terms-title">Termos de uso</h1>
        <p className="legal-updated">Última atualização: 15 de setembro de 2026.</p>
        <p>Ao acessar ou utilizar o {SITE_NAME}, você concorda com estes termos. Caso não concorde, não utilize a plataforma.</p>

        <section><h2>1. Requisito de idade</h2><p>Este site é destinado exclusivamente a pessoas com 18 anos ou mais. Ao continuar a navegação, você declara que possui idade legal para acessar o conteúdo e os links apresentados.</p></section>
        <section><h2>2. Finalidade da plataforma</h2><p>A plataforma funciona como um diretório de grupos públicos do Telegram. Os grupos são enviados por usuários e podem passar por revisão, mas cada comunidade possui regras e administração próprias.</p></section>
        <section><h2>3. Responsabilidade pelo conteúdo</h2><p>O responsável por cada grupo, postagem, imagem, link e mensagem é o respectivo administrador ou participante da comunidade. Não publicamos nem controlamos o conteúdo distribuído dentro do Telegram.</p></section>
        <section><h2>4. Uso permitido</h2><p>Você não pode usar o site para enviar links ilegais, enganosos, maliciosos, que violem direitos de terceiros ou que exponham menores de idade. Podemos recusar, remover ou desativar grupos que não atendam a estes termos.</p></section>
        <section><h2>5. Envio de grupos</h2><p>Ao enviar um grupo para análise, você confirma que possui autorização para divulgá-lo e que os dados fornecidos são verdadeiros. O envio não garante publicação, destaque ou permanência no catálogo.</p></section>
        <section><h2>6. Links externos</h2><p>Os botões levam a serviços de terceiros, especialmente o Telegram. A navegação nesses serviços está sujeita às políticas próprias deles. Não nos responsabilizamos por indisponibilidades, mudanças ou interações ocorridas fora deste site.</p></section>
        <section><h2>7. Alterações e contato</h2><p>Estes termos podem ser atualizados para refletir mudanças na plataforma ou na legislação aplicável. Para solicitar a revisão de um grupo ou reportar uma violação, utilize os canais de contato divulgados pela administração.</p></section>
      </article>
    </main>
  );
}

function PublicLayout() {
  return (
    <>
      <AgeNotice />
      <SiteHeader />
      <Outlet />
      <aside className="safety-poster" aria-label="Aviso de proteção a crianças e adolescentes">
        <img alt="Pedofilia é crime. Denuncie. Disque 100 ou 181." src={safetyPoster} />
      </aside>
      <SiteFooter />
    </>
  );
}

function GroupCardContent({ group }: { group: PublicGroup }) {
  return (
    <>
      <img alt={`Imagem do grupo ${group.name}`} className="group-image" decoding="async" loading="lazy" referrerPolicy="no-referrer" src={group.image || imagemGrupos} />
      <div className="group-card-content">
        <h3>{group.name}</h3>
        <p>{group.description}</p>
        <GroupTags group={group} limit={3} showCategory={false} />
      </div>
    </>
  );
}

function LikeButton({ group, onLiked, compact = false }: { group: PublicGroup; onLiked: (groupId: number, likes: number) => void; compact?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [likeError, setLikeError] = useState('');
  const notifyLiked = useEffectEvent(onLiked);

  useEffect(() => {
    let isActive = true;
    async function loadLikeStatus() {
      try {
        const visitorId = getVisitorId();
        const response = await fetch(apiUrl(`/api/public/groups/${group.id}/like-status?visitorId=${encodeURIComponent(visitorId)}`));
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.erro || 'Não foi possível consultar os votos.');
        if (!isActive) return;
        setLiked(Boolean(data.liked));
        notifyLiked(group.id, Number(data.likes) || 0);
      } catch (error) {
        if (isActive) setLikeError(error instanceof Error ? error.message : 'Não foi possível consultar os votos.');
      } finally {
        if (isActive) setIsChecking(false);
      }
    }
    void loadLikeStatus();
    return () => { isActive = false; };
  }, [group.id]);

  async function likeGroup() {
    if (liked || isSaving || isChecking) return;
    const previousLikes = Number(group.likes) || 0;
    setIsSaving(true);
    setLikeError('');
    setLiked(true);
    onLiked(group.id, previousLikes + 1);
    try {
      const response = await fetch(apiUrl(`/api/public/groups/${group.id}/like`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: getVisitorId() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Não foi possível curtir o grupo.');
      onLiked(group.id, Number(data.likes));
    } catch (error) {
      console.error('Erro ao curtir grupo:', error);
      setLiked(false);
      onLiked(group.id, previousLikes);
      setLikeError(error instanceof Error ? error.message : 'Não foi possível curtir o grupo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <span className="like-control">
      <button
        aria-label={liked ? `${group.name} já foi curtido` : `Curtir ${group.name}`}
        className={`group-like-button ${liked ? 'is-liked' : ''} ${compact ? 'is-compact' : ''}`}
        disabled={liked || isSaving || isChecking}
        onClick={() => void likeGroup()}
        title={liked ? 'Você curtiu este grupo' : 'Curtir grupo'}
        type="button"
      >
        <ThumbsUp aria-hidden="true" size={compact ? 16 : 18} />
        <span>{formatCount(Number(group.likes) || 0)}</span>
      </button>
      {likeError && <small className="like-error" role="status">{likeError}</small>}
    </span>
  );
}

function GroupTags({ group, limit, showCategory = true }: { group: PublicGroup; limit?: number; showCategory?: boolean }) {
  const hashtags = limit === undefined ? (group.hashtags || []) : (group.hashtags || []).slice(0, limit);
  if (!showCategory && hashtags.length === 0) return null;

  return (
    <div className="group-tags" aria-label={showCategory ? 'Categoria e hashtags do grupo' : 'Hashtags do grupo'}>
      {showCategory && <Link className="group-category-tag" to={`/categorias/${encodeURIComponent(group.categoryUrl)}`}>{group.category || 'Comunidade'}</Link>}
      {hashtags.map((hashtag) => <span key={hashtag}>#{hashtag}</span>)}
    </div>
  );
}

function GroupDetailsFaq({ group }: { group: PublicGroup }) {
  const groupName = group.name.trim() || 'este grupo';
  const categoryName = group.category.trim().toLocaleLowerCase('pt-BR') || 'conteúdo adulto';
  const memberCount = group.members !== null && Number.isFinite(group.members)
    ? `${formatCount(group.members)} ${group.members === 1 ? 'membro' : 'membros'}`
    : '';
  const updateMonth = formatMonthYear(group.membersUpdatedAt || group.createdAt);
  const membersAnswer = memberCount
    ? `O ${groupName} tem cerca de ${memberCount}${updateMonth ? ` e este anúncio foi atualizado em ${updateMonth}.` : '.'}`
    : `A quantidade de membros do ${groupName} está indisponível no momento${updateMonth ? `; este anúncio foi atualizado em ${updateMonth}.` : '.'}`;

  return (
    <section className="group-details-faq" aria-labelledby="group-details-faq-title">
      <h2 id="group-details-faq-title">Perguntas frequentes</h2>
      <div className="group-details-faq-list">
        <details className="group-details-faq-item" open>
          <summary>Como entrar no {groupName} no Telegram?</summary>
          <p>Clique no botão “Entrar no grupo pelo Telegram” nesta página. Você será redirecionado para o Telegram para abrir o {groupName} e entrar de graça — sem cadastro.</p>
        </details>
        <details className="group-details-faq-item" open>
          <summary>O {groupName} é grátis?</summary>
          <p>Sim. O {groupName} é gratuito, como todo grupo do nosso diretório. Alguns grupos oferecem conteúdo VIP opcional, mas a entrada é sempre grátis.</p>
        </details>
        <details className="group-details-faq-item" open>
          <summary>O {groupName} é seguro e +18?</summary>
          <p>O {groupName} é um grupo adulto (+18) de {categoryName}, então o conteúdo é só para maiores. Verificamos os links com frequência, mas siga sempre as regras do Telegram e nunca compartilhe conteúdo ilegal.</p>
        </details>
        <details className="group-details-faq-item" open>
          <summary>Quantos membros tem o {groupName}?</summary>
          <p>{membersAnswer}</p>
        </details>
      </div>
    </section>
  );
}

function ShareActions({ group, compact = false }: { group: PublicGroup; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = siteUrl(groupPath(group));
  const message = `Conheca o grupo ${group.name} no Telegram: ${pageUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(`Conheca ${group.name}`)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copie o link do grupo:', pageUrl);
    }
  }

  async function shareNatively() {
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, text: `Conheca o grupo ${group.name}`, url: pageUrl });
      } catch {
        // O cancelamento do compartilhamento nao precisa de mensagem.
      }
      return;
    }
    await copyLink();
  }

  if (compact) {
    return <button aria-label={`Compartilhar ${group.name}`} className="share-button" onClick={() => void shareNatively()} title="Compartilhar" type="button"><Share2 size={16} /></button>;
  }

  return (
    <div className="share-actions" aria-label={`Compartilhar ${group.name}`}>
      <span>Compartilhar</span>
      <button aria-label="Compartilhar pelo WhatsApp" className="share-button whatsapp" onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')} title="WhatsApp" type="button"><MessageCircle size={17} /></button>
      <a aria-label="Compartilhar pelo Telegram" className="share-button telegram" href={telegramUrl} rel="noopener noreferrer" target="_blank" title="Telegram"><Send size={16} /></a>
      <button aria-label={copied ? 'Link copiado' : 'Copiar link'} className="share-button" onClick={() => void copyLink()} title={copied ? 'Link copiado' : 'Copiar link'} type="button">{copied ? <Check size={16} /> : <Link2 size={16} />}</button>
      <button className="share-native-button" onClick={() => void shareNatively()} type="button"><Share2 size={16} />Mais opções</button>
    </div>
  );
}

function GroupCard({ group, onAccess, onLiked }: { group: PublicGroup; onAccess: (groupId: number) => void; onLiked: (groupId: number, likes: number) => void }) {
  const isFeatured = group.featured;
  const navigate = useNavigate();

  function openCard(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('a, button')) return;
    if (isFeatured) {
      const safeGroupLink = safeTelegramUrl(group.link);
      if (!safeGroupLink) return;
      onAccess(group.id);
      window.location.assign(safeGroupLink);
      return;
    }
    navigate(groupPath(group));
  }

  function openCardWithKeyboard(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openCard(event as unknown as React.MouseEvent<HTMLElement>);
  }

  return (
    <article aria-label={isFeatured ? `Entrar no grupo ${group.name}` : `Ver detalhes do grupo ${group.name}`} className={`group-card ${isFeatured ? 'group-card-featured' : ''}`} key={group.id} onClick={openCard} onKeyDown={openCardWithKeyboard} role={isFeatured ? 'link' : undefined} tabIndex={isFeatured ? 0 : undefined}>
      {isFeatured && <span className="group-featured-ribbon">Destaque</span>}
      {isFeatured ? <GroupCardContent group={group} /> : <Link aria-label={`Ver detalhes do grupo ${group.name}`} className="group-card-link" to={groupPath(group)}><GroupCardContent group={group} /></Link>}
      <div className="group-card-actions">
        {isFeatured
          ? <a className="group-card-action" href={group.link} onClick={() => onAccess(group.id)} rel="ugc nofollow noopener noreferrer">Acessar grupo <span aria-hidden="true">-&gt;</span></a>
          : <Link className="group-card-action" to={groupPath(group)}>Ver detalhes <span aria-hidden="true">-&gt;</span></Link>}
        <LikeButton compact group={group} onLiked={onLiked} />
        <ShareActions compact group={group} />
      </div>
    </article>
  );
}

function LandingPage() {
  const { categorySlug = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [stats, setStats] = useState<PublicStats>({ totalGroups: 0, totalMembers: 0, totalCategories: 0, totalAccesses: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recentes');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openFaq, setOpenFaq] = useState(0);
  const searchParameters = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedCategory = categorySlug || searchParameters.get('categoria') || '';
  const selectedHashtag = searchParameters.get('hashtag') || '';

  useEffect(() => {
    async function fetchPublicGroups() {
      try {
        const [groupsResponse, categoriesResponse, statsResponse] = await Promise.all([
          fetch(apiUrl('/api/public/groups')),
          fetch(apiUrl('/api/public/categories')),
          fetch(apiUrl('/api/public/stats')),
        ]);
        const [groupsData, categoriesData, statsData] = await Promise.all([groupsResponse.json(), categoriesResponse.json(), statsResponse.json()]);
        if (groupsResponse.ok) setGroups((groupsData as PublicGroup[]).map(normalizePublicGroup));
        if (categoriesResponse.ok) setCategories(categoriesData);
        if (statsResponse.ok) setStats(statsData);
      } catch (error) {
        console.error('Erro ao buscar grupos:', error);
      }
    }
    void fetchPublicGroups();
  }, []);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('pt-BR');
    const filtered = groups.filter((group) => {
      const matchesCategory = !selectedCategory || group.categoryUrl === selectedCategory;
      const matchesHashtag = !selectedHashtag || (group.hashtags || []).includes(selectedHashtag);
      const searchableContent = [group.name, group.description, group.category, ...(group.hashtags || [])].join(' ').toLocaleLowerCase('pt-BR');
      return matchesCategory && matchesHashtag && (!normalizedQuery || searchableContent.includes(normalizedQuery));
    });

    return [...filtered].sort((first, second) => {
      if (first.featured !== second.featured) return Number(second.featured) - Number(first.featured);
      if (sortMode === 'votados') return (Number(second.likes) || 0) - (Number(first.likes) || 0) || second.id - first.id;
      if (sortMode === 'membros') return (second.members ?? -1) - (first.members ?? -1) || second.id - first.id;
      if (sortMode === 'acessados') return (Number(second.accesses) || 0) - (Number(first.accesses) || 0) || second.id - first.id;
      const dateDifference = Date.parse(second.createdAtIso || '') - Date.parse(first.createdAtIso || '');
      return (Number.isFinite(dateDifference) ? dateDifference : 0) || second.id - first.id;
    });
  }, [groups, searchQuery, selectedCategory, selectedHashtag, sortMode]);

  const totalPages = Math.ceil(visibleGroups.length / groupsPerPage);
  const paginatedGroups = visibleGroups.slice((currentPage - 1) * groupsPerPage, currentPage * groupsPerPage);
  const currentCategory = categories.find((category) => category.url === selectedCategory);
  const isCategoryPage = Boolean(categorySlug);
  const categoryLabel = currentCategory?.name || categorySlug.replace(/[-_]+/g, ' ').trim();
  const canonicalPath = isCategoryPage ? `/categorias/${encodeURIComponent(categorySlug)}` : '/';
  const pageTitle = isCategoryPage ? `Grupos de ${categoryLabel} no Telegram +18` : HOME_TITLE;
  const pageDescription = isCategoryPage
    ? `Veja grupos de ${categoryLabel} no Telegram para maiores de 18 anos. Encontre links ativos, descrições e comunidades adultas da categoria.`
    : SITE_DESCRIPTION;
  const invalidCategory = isCategoryPage && categories.length > 0 && !currentCategory;
  const structuredData = useMemo(() => {
    const pageUrl = siteUrl(canonicalPath);
    const graph: Record<string, unknown>[] = [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl('/')}#website`,
        name: SITE_NAME,
        alternateName: 'Grupos adultos no Telegram',
        url: siteUrl('/'),
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: pageTitle,
        description: pageDescription,
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${siteUrl('/')}#website` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: visibleGroups.length,
          itemListElement: visibleGroups.slice(0, groupsPerPage).map((group, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: group.name,
            url: siteUrl(groupPath(group)),
          })),
        },
      },
    ];

    if (currentCategory) {
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: siteUrl('/') },
          { '@type': 'ListItem', position: 2, name: currentCategory.name, item: pageUrl },
        ],
      });
    } else if (!isCategoryPage) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      });
    }
    return graph;
  }, [canonicalPath, currentCategory, isCategoryPage, pageDescription, pageTitle, visibleGroups]);

  function clearGroupFilters() {
    setCurrentPage(1);
    navigate('/#groups');
  }

  function registerAccess(groupId: number) {
    setGroups((currentGroups) => currentGroups.map((group) => group.id === groupId ? { ...group, accesses: group.accesses + 1 } : group));
    const url = apiUrl(`/api/public/groups/${groupId}/access`);
    if (navigator.sendBeacon?.(url)) return;
    void fetch(url, { method: 'POST', keepalive: true });
  }

  function updateLikes(groupId: number, likes: number) {
    setGroups((currentGroups) => currentGroups.map((group) => group.id === groupId ? { ...group, likes } : group));
  }

  return (
    <>
      <PageMeta description={pageDescription} image={imagemGrupos} imageAlt="Diretório de grupos adultos no Telegram" noIndex={invalidCategory} path={canonicalPath} structuredData={structuredData} title={pageTitle} />
      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <h1>
              <span className="hero-title-lead">Putaria Telegram:</span>{' '}
              <strong className="gradient-roxo hero-title-accent"><span className="hero-title-line">grupos de putaria</span>{' '}<span className="hero-title-line">verificados +18</span></strong>
            </h1>

            <p>O diretório de <strong className="color-text">grupos de putaria no Telegram</strong> com <strong className="color-text">verificação automática de link</strong>: grupo que cai ou expira é detectado e removido, então você só entra em grupo que realmente funciona. Amadoras, novinhas, casais, gays e mais — grátis, +18 e sem cadastro.</p>
            <div className="btn-container">
              <Button className="hero-groups-button" href="#groups">Ver grupos agora</Button>
              <Button className="hero-submit-button" href="/adicionar-grupo">+ Enviar meu grupo</Button>

            </div>
            <div className="cards-container">
              <Cards numero={stats.totalGroups || groups.length} descricao="Grupos ativos" />
              <Cards numero={stats.totalCategories || categories.length} descricao="Categorias" />
              <Cards numero={formatCount(stats.totalAccesses)} descricao="Acessos" />
            </div>
          </div>
        </section>

        <section className="groups-section" id="groups">
          <div className="groups-content">
            <h2>{isCategoryPage ? `Grupos +18 de ${categoryLabel}` : 'Lista de grupos +18 no Telegram'}</h2>
            <p>{isCategoryPage ? `Comunidades adultas de ${categoryLabel} com links diretos para o Telegram.` : 'Explore grupos de pornô no Telegram, comunidades para adultos, casais, público LGBTQIA+ e outras categorias.'}</p>
            <div className="group-tools">
              <label className="group-search">
                <Search aria-hidden="true" size={19} />
                <span className="sr-only">Pesquisar grupos</span>
                <input onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }} placeholder="Pesquise por nome, categoria ou assunto" type="search" value={searchQuery} />
              </label>
              <div className={`sort-menu ${sortMenuOpen ? 'is-open' : ''}`}>
                <button aria-expanded={sortMenuOpen} className="sort-menu-trigger" onClick={() => setSortMenuOpen((open) => !open)} type="button"><SlidersHorizontal aria-hidden="true" size={18} /> Ordenar: {sortOptions.find((option) => option.value === sortMode)?.label}<ChevronDown aria-hidden="true" size={17} /></button>
                {sortMenuOpen && <div className="sort-menu-panel">
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button className={sortMode === option.value ? 'active' : ''} key={option.value} onClick={() => { setSortMode(option.value); setSortMenuOpen(false); setCurrentPage(1); }} type="button">
                        <Icon aria-hidden="true" size={18} />
                        <span><strong>{option.label}</strong><small>{option.description}</small></span>
                      </button>
                    );
                  })}
                </div>}
              </div>
            </div>
            <div className="filter-scroll-shell">
              <div aria-label="Filtrar por categoria" className="filter-container">
                <Link className={`filter-button ${selectedCategory === '' && selectedHashtag === '' ? 'active' : ''}`} onClick={() => setCurrentPage(1)} to="/#groups">Todos</Link>
                {categories.map((category) => (
                  <Link className={`filter-button ${selectedCategory === category.url && !selectedHashtag ? 'active' : ''}`} key={category.id} onClick={() => setCurrentPage(1)} to={`/categorias/${encodeURIComponent(category.url)}#groups`}>
                    {category.name}
                  </Link>
                ))}
                {selectedHashtag && <button className="filter-button active" onClick={clearGroupFilters} type="button">#{selectedHashtag} ×</button>}
              </div>
            </div>

            <div className="groups-grid">
              {paginatedGroups.map((group) => <GroupCard group={group} key={group.id} onAccess={registerAccess} onLiked={updateLikes} />)}
              {visibleGroups.length === 0 && <p>Nenhum grupo encontrado.</p>}
            </div>
            {totalPages > 1 && (
              <nav aria-label="Páginas de grupos" className="pagination">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button aria-current={currentPage === page ? 'page' : undefined} className={currentPage === page ? 'active' : ''} key={page} onClick={() => { setCurrentPage(page); document.querySelector('#groups')?.scrollIntoView({ behavior: 'smooth' }); }} type="button">{page}</button>
                ))}
              </nav>
            )}
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="faq-content">
            <div className="faq-heading">
              <span>FAQ</span>
              <h2>Perguntas frequentes</h2>
              <p>Encontre respostas rápidas antes de descobrir sua próxima comunidade.</p>
            </div>
            <div className="faq-list">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <article className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.question}>
                    <h3>
                      <button aria-controls={`faq-answer-${index}`} aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? -1 : index)} type="button">
                        {item.question}
                        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                      </button>
                    </h3>
                    <p hidden={!isOpen} id={`faq-answer-${index}`}>{item.answer}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function AddGroupPage() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [submissionForm, setSubmissionForm] = useState<SubmissionForm>(emptySubmissionForm);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(apiUrl('/api/public/submission-categories'));
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar as categorias.');
        setCategories(data);
      } catch (error) {
        setSubmissionMessage(error instanceof Error ? error.message : 'Não foi possível carregar as categorias.');
      }
    }
    void loadCategories();
  }, []);

  function updateSubmissionForm(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setSubmissionForm((current) => ({ ...current, [name]: value }));
  }

  async function submitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const telegramLink = safeTelegramUrl(submissionForm.link_telegram);
    if (!telegramLink) {
      setSubmissionMessage('Informe um link HTTPS válido do Telegram (t.me).');
      return;
    }
    setIsSubmitting(true);
    setSubmissionMessage('');
    try {
      const response = await fetch(apiUrl('/api/public/group-submissions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submissionForm, link_telegram: telegramLink }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível enviar o grupo.');
      setSubmissionForm(emptySubmissionForm);
      setSubmissionMessage(data.mensagem);
    } catch (error) {
      setSubmissionMessage(error instanceof Error ? error.message : 'Não foi possível enviar o grupo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="add-group-page">
      <PageMeta description={`Envie seu grupo para análise no ${SITE_NAME}.`} path="/adicionar-grupo" title="Adicionar grupo" />
      <section className="submission-section">
        <div className="submission-content">
          <div className="submission-intro">
            <Link className="back-link light" to="/#groups">← Voltar para os grupos</Link>
            <span>DIVULGUE SUA COMUNIDADE</span>
            <h1>Adicione seu grupo</h1>
            <p>Envie os dados da sua comunidade. Nossa equipe faz uma análise antes de publicar o grupo para todos.</p>
            <ul>
              <li>Cadastro gratuito e revisado.</li>
              <li>Seu e-mail é usado apenas para retorno sobre a solicitação.</li>
              <li>O grupo precisa ter um link público do Telegram.</li>
            </ul>
          </div>
          <form className="submission-form" onSubmit={(event) => void submitGroup(event)}>
            <div className="submission-form-heading"><h2>Dados do grupo</h2><p>Campos com * são obrigatórios.</p></div>
            <div className="submission-field"><label htmlFor="submission-name">Nome do grupo *</label><input id="submission-name" maxLength={150} name="nome_grupo" onChange={updateSubmissionForm} required value={submissionForm.nome_grupo} /></div>
            <div className="submission-form-row">
              <div className="submission-field"><label htmlFor="submission-category">Categoria *</label><select id="submission-category" name="id_categoria" onChange={updateSubmissionForm} required value={submissionForm.id_categoria}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
              <div className="submission-field"><label htmlFor="submission-telegram">Link do Telegram *</label><input id="submission-telegram" inputMode="url" name="link_telegram" onChange={updateSubmissionForm} placeholder="https://t.me/seugrupo" required title="Use um link HTTPS do Telegram, como https://t.me/seugrupo" type="url" value={submissionForm.link_telegram} /></div>
            </div>
            <div className="submission-field"><label htmlFor="submission-description">Descrição *</label><textarea id="submission-description" maxLength={5000} name="descricao_grupo" onChange={updateSubmissionForm} required rows={4} value={submissionForm.descricao_grupo} /></div>
            <div className="submission-form-row">
              <div className="submission-field"><label htmlFor="submission-contact">Seu nome *</label><input id="submission-contact" maxLength={150} name="nome_contato" onChange={updateSubmissionForm} required value={submissionForm.nome_contato} /></div>
              <div className="submission-field"><label htmlFor="submission-email">Seu e-mail *</label><input id="submission-email" maxLength={254} name="email_contato" onChange={updateSubmissionForm} required type="email" value={submissionForm.email_contato} /></div>
            </div>
            {submissionMessage && <p aria-live="polite" className="submission-message">{submissionMessage}</p>}
            <button className="submission-submit" disabled={isSubmitting} type="submit">{isSubmitting ? 'Enviando...' : 'Enviar grupo para análise'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function GroupDetailsPage() {
  const { slug = '' } = useParams();
  const groupId = slug.match(/(?:^|-)(\d+)$/)?.[1] || '';
  const [group, setGroup] = useState<PublicGroup | null>(null);
  const [relatedGroups, setRelatedGroups] = useState<PublicGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [groupId]);

  useEffect(() => {
    async function loadGroup() {
      setIsLoading(true);
      setError('');
      setIsNotFound(false);
      if (!groupId) {
        setGroup(null);
        setRelatedGroups([]);
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }
      try {
        const [groupResponse, groupsResponse] = await Promise.all([
          fetch(apiUrl(`/api/public/groups/${groupId}`)),
          fetch(apiUrl('/api/public/groups')),
        ]);
        const [groupData, groupsData] = await Promise.all([
          groupResponse.json().catch(() => ({})),
          groupsResponse.json().catch(() => []),
        ]);
        if (groupResponse.status === 404) {
          setGroup(null);
          setRelatedGroups([]);
          setIsNotFound(true);
          return;
        }
        if (!groupResponse.ok) throw new Error(groupData.erro || 'Não foi possível carregar este grupo.');
        const normalizedGroup = normalizePublicGroup(groupData);
        setGroup(normalizedGroup);
        const canonicalPath = groupPath(normalizedGroup);
        if (window.location.pathname !== canonicalPath) window.history.replaceState(null, '', canonicalPath);
        if (groupsResponse.ok) {
          const allGroups = (groupsData as PublicGroup[]).map(normalizePublicGroup);
          setRelatedGroups(allGroups.filter((item) => item.id !== normalizedGroup.id).sort((first, second) => Number(second.categoryUrl === normalizedGroup.categoryUrl) - Number(first.categoryUrl === normalizedGroup.categoryUrl)).slice(0, 6));
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar este grupo.');
      } finally {
        setIsLoading(false);
      }
    }
    void loadGroup();
  }, [groupId]);

  function registerAccess() {
    if (!group) return;
    registerRelatedAccess(group.id);
  }

  function registerRelatedAccess(groupId: number) {
    setGroup((current) => current?.id === groupId ? { ...current, accesses: current.accesses + 1 } : current);
    setRelatedGroups((current) => current.map((item) => item.id === groupId ? { ...item, accesses: item.accesses + 1 } : item));
    const url = apiUrl(`/api/public/groups/${groupId}/access`);
    if (navigator.sendBeacon?.(url)) return;
    void fetch(url, { method: 'POST', keepalive: true });
  }

  function updateLikes(groupId: number, likes: number) {
    setGroup((current) => current?.id === groupId ? { ...current, likes } : current);
    setRelatedGroups((current) => current.map((item) => item.id === groupId ? { ...item, likes } : item));
  }

  const groupStructuredData = useMemo(() => {
    if (!group) return undefined;
    const pageUrl = siteUrl(groupPath(group));
    const categoryUrl = siteUrl(`/categorias/${encodeURIComponent(group.categoryUrl)}`);
    return [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl('/')}#website`,
        name: SITE_NAME,
        alternateName: 'Grupos adultos no Telegram',
        url: siteUrl('/'),
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${group.name}: grupo +18 no Telegram`,
        description: group.description,
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${siteUrl('/')}#website` },
        about: { '@type': 'Thing', name: `Grupo adulto de ${group.category} no Telegram` },
        ...(group.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: group.image } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: siteUrl('/') },
          { '@type': 'ListItem', position: 2, name: group.category, item: categoryUrl },
          { '@type': 'ListItem', position: 3, name: group.name, item: pageUrl },
        ],
      },
    ];
  }, [group]);

  if (isNotFound) return <NotFoundPage />;

  return (
    <main className="group-details-page">
      <PageMeta
        description={group ? `${group.name}: grupo +18 no Telegram na categoria ${group.category}. ${group.description}` : 'Detalhes de um grupo adulto no Telegram.'}
        image={group?.image || imagemGrupos}
        imageAlt={group ? `Imagem do grupo adulto ${group.name} no Telegram` : 'Grupos adultos no Telegram'}
        noIndex={!group}
        path={group ? groupPath(group) : undefined}
        structuredData={groupStructuredData}
        title={group ? `${group.name}: grupo +18 no Telegram` : 'Grupo adulto no Telegram'}
      />
      <section className="group-details">
        <Link className="back-link" to="/#groups">← Voltar para os grupos</Link>
        {isLoading && <p className="details-status">Carregando informações do grupo...</p>}
        {error && (
          <div className="details-status details-error">
            <h1>Não foi possível abrir este grupo</h1>
            <p>{error}</p>
            <Link to="/#groups">Ver todos os grupos</Link>
          </div>
        )}
        {group && (
          <>
            <div className="group-details-card">
              <img alt={`Imagem do grupo ${group.name}`} className="group-details-image" decoding="async" referrerPolicy="no-referrer" src={group.image || imagemGrupos} />
              <div className="group-details-content">
                <span className="details-category">{group.category}</span>
                <h1>{group.name}</h1>
                <p className="group-details-description">{group.description}</p>
                <GroupTags group={group} />
                <div className="details-info">
                  <div><span>Categoria</span><Link to={`/categorias/${encodeURIComponent(group.categoryUrl)}`}>{group.category}</Link></div>
                  <div><span>Status</span><strong>Grupo verificado</strong></div>
                  <div><span>Data de cadastro</span><strong>{group.createdAt || 'N\u00e3o informada'}</strong></div>
                  <div><span>Membros no Telegram</span><strong>{group.members === null ? 'Indispon\u00edvel' : formatCount(group.members)}</strong></div>
                  <div><span>Acessos pelo site</span><strong>{formatCount(group.accesses)}</strong></div>
                </div>
                <a className="details-join-button" href={hasOpenedTelegramFolder() ? group.link : telegramFolderUrl} onClick={(event) => handleTelegramGroupLink(event, group.link, registerAccess)} rel="ugc nofollow noopener noreferrer" target="_blank">
                  Entrar no grupo pelo Telegram <span aria-hidden="true">→</span>
                </a>
                <LikeButton group={group} onLiked={updateLikes} />
                <ShareActions group={group} />
              </div>
            </div>
            <section className="group-about" aria-labelledby="group-about-title">
              <h2 id="group-about-title">Sobre o {group.name}</h2>
              <p>Grupos de {group.category.toLocaleLowerCase('pt-BR')} no Telegram reúnem conteúdo caseiro e real enviado pelos próprios usuários, sem estúdio. Espere fotos e vídeos amadores, pacotes vazados e postagens ao longo do dia.</p>
              <p>O {group.name} está listado em <Link to={`/categorias/${encodeURIComponent(group.categoryUrl)}`}>grupos de {group.category.toLocaleLowerCase('pt-BR')} no Telegram</Link> no nosso diretório. Veja mais <Link to="/#groups">categorias</Link> ou confira os <Link to="/#groups">grupos de putaria mais populares</Link> para descobrir canais +18 parecidos.</p>
            </section>
            <GroupDetailsFaq group={group} />
          </>
        )}
      </section>
      {relatedGroups.length > 0 && (
        <section className="related-groups" aria-labelledby="related-groups-title">
          <div className="related-groups-heading">
            <div><span>CONTINUE EXPLORANDO</span><h2 id="related-groups-title">Outros grupos +18 no Telegram</h2></div>
            <Link to="/#groups">Ver todos os grupos →</Link>
          </div>
          <div className="groups-grid">
            {relatedGroups.map((relatedGroup) => <GroupCard group={relatedGroup} key={relatedGroup.id} onAccess={registerRelatedAccess} onLiked={updateLikes} />)}
          </div>
        </section>
      )}
    </main>
  );
}

function NotFoundPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="not-found-page">
      <PageMeta description="A página solicitada não existe ou foi removida." noIndex title="Página não encontrada" />
      <section className="not-found-content" aria-labelledby="not-found-title">
        <span className="not-found-code">404</span>
        <h1 id="not-found-title">Página não encontrada</h1>
        <p>O endereço pode estar incorreto ou a página pode ter sido removida.</p>
        <div className="not-found-actions">
          <Link className="not-found-primary" to="/">Voltar ao início</Link>
          <Link className="not-found-secondary" to="/#groups">Ver grupos</Link>
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/categorias/:categorySlug" element={<LandingPage />} />
          <Route path="/adicionar-grupo" element={<AddGroupPage />} />
          <Route path="/grupos/:slug" element={<GroupDetailsPage />} />
          <Route path="/termos-de-uso" element={<TermsOfUsePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/login" element={<Navigate replace to="/dash" />} />
        <Route path="/dash" element={<Login />} />
        <Route path="/admin" element={<RequireAdmin><DashboardLayout /></RequireAdmin>}>
          <Route index element={<DashboardHome />} />
          <Route path="grupos" element={<DashboardGroups />} />
          <Route path="grupos/novo" element={<DashboardGroupForm />} />
          <Route path="grupos/:id/editar" element={<DashboardGroupForm />} />
          <Route path="solicitacoes" element={<DashboardSubmissions />} />
          <Route path="categorias" element={<DashboardCategories />} />
          <Route path="usuarios" element={<DashboardUsers />} />
          <Route path="configuracoes" element={<DashboardSettings />} />
          <Route path="*" element={<Navigate replace to="/admin" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
