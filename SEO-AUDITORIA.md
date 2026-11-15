# Auditoria técnica de SEO — 15/11/2026

## 1. Problemas encontrados

| Gravidade | Evidência e causa | Arquivos relacionados |
| --- | --- | --- |
| Alta | As 57 URLs públicas entregavam `#root` vazio. O servidor gerava metadados, mas o conteúdo e os links dependiam da execução do React no navegador. Isso cria dependência da etapa de renderização dos buscadores; não comprova a causa de exclusão de uma URL específica do índice. | `backend/src/services/seoRenderer.js`, `backend/index.js`, `frontend/src/App.tsx`, `frontend/src/main.tsx` |
| Média | O sitemap usava a criação dos grupos como `lastmod`, sem timestamp confiável de edição. Edições e remoções não eram representadas por essa data. | `backend/src/controllers/publicController.js` |
| Média | O sitemap permitia uma hora de cache e mais um dia de conteúdo obsoleto, atrasando a retirada de URLs desativadas. | `backend/src/controllers/publicController.js` |
| Baixa | Codificação inválida em URLs de grupos/categorias era tratada como falha temporária de banco, devolvendo 503. | `backend/src/services/seoRenderer.js` |
| Baixa | O Open Graph de grupos mudava de `article` para `website` quando o cliente executava. Durante a busca inicial, também substituía temporariamente os metadados específicos por genéricos. | `frontend/src/App.tsx` |

Não foi encontrado redirecionamento indevido de grupo válido para a página inicial. A URL de exemplo `/grupos/The-Private-Club-37` respondeu 200 com canonical próprio. As 57 URLs do sitemap responderam 200, sem `noindex`, com canonical correspondente e sem títulos ou meta descriptions duplicados. Variações de slug, caixa e barra final testadas redirecionaram corretamente para o grupo.

O `robots.txt` permite as páginas públicas e identifica o sitemap. A classificação `rating=adult` foi mantida. As áreas administrativas continuam excluídas da indexação. A configuração Docker Compose legada contorna o renderer ao servir HTML estático pelo Nginx; ela não foi alterada nem usada nesta auditoria. O runtime efetivo deve ser confirmado no hPanel antes da publicação.

## 2. Correções realizadas

- SSR com os componentes React existentes, seguido de hidratação. Home, categorias, detalhes e páginas institucionais recebem conteúdo no HTML inicial; visitantes e Googlebot recebem o mesmo HTML.
- Contexto de dados públicos isolado por requisição, sem dados administrativos, credenciais, chamadas ao Telegram ou escritas durante SSR. A serialização impede fechamento de script e preserva o texto cadastrado.
- Metadados específicos e canonical existentes preservados; Open Graph dos grupos alinhado como `article` no servidor e no navegador.
- Preferências de idade e sessão compatíveis com hidratação, sem modificar os controles existentes. Navegação entre grupos impede respostas antigas de sobrescrever a rota atual e restaura o grupo inicial ao voltar.
- Build gera `frontend/dist` e `frontend/dist-server`. O segundo diretório permanece fora da pasta pública. URLs das imagens são iguais nos dois builds, usando os mesmos arquivos originais.
- Sitemap consulta somente grupos e categorias ativos, elimina duplicatas e exige revalidação. Não publica `lastmod` sem data confiável. Falhas retornam 503 com `Retry-After`, sem XML parcial.
- URLs malformadas retornam 400; grupos ausentes/inativos continuam em 404; falhas temporárias de dados ou SSR retornam 503. Redirecionamentos 301 existentes foram preservados.
- Atualização habitual de membros pela API preservada, com agendamento independente do cache preenchido pelo SSR e limite de 20 segundos.

Arquivos de implementação modificados: `.gitignore`, `DEPLOYMENT.md`, `backend/index.js`, `backend/src/controllers/publicController.js`, `backend/src/services/seoRenderer.js`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/App.tsx`, `frontend/src/main.tsx`.

Arquivos adicionados: `frontend/src/PublicPageData.tsx`, `frontend/src/entry-server.tsx`, `backend/test/rendered-pages.test.js`, `backend/test/sitemap.test.js` e este relatório. `backend/test/seo.test.js` recebeu cobertura adicional de URLs malformadas. Nenhuma dependência ou lockfile foi alterado.

## 3. Resultados dos testes

| Verificação | Resultado |
| --- | --- |
| Testes automatizados | Execução final: 39 aprovados, zero falhas e zero ignorados, incluindo o renderer compilado real; Node 22.23.5 com `--test-concurrency=1`. |
| TypeScript e build de produção | Aprovados; geração dos artefatos cliente e servidor. |
| ESLint | Aprovado. |
| Rotas locais com cópia dos dados públicos reais | 57/57 com 200, conteúdo SSR, H1, canonical correspondente, sem `noindex` e JSON-LD com JSON válido. |
| Produção antes das alterações | 57/57 URLs do sitemap com 200 e canonical correto; corpo inicial vazio em todas. |
| Status e normalização | 301 para slug antigo/caixa/barra final e `/index.html`; 400 para codificação inválida; 404 para página, categoria ou grupo ausente; 503 em falhas simuladas. |
| Sitemap e robots | HTTP 200; 57 URLs únicas; XML válido, somente catálogo público; mudanças de cadastro/desativação simuladas refletidas na leitura seguinte. |
| Navegador com JavaScript desativado | Home, índice de categorias, categoria, três grupos reais e página inexistente apresentam conteúdo inicial e status esperado. |
| Comparação anterior/corrigida | 8 páginas em 390 e 1440 pixels: textos, URLs de imagens, fontes, cores e geometria dos elementos comparados iguais; sem rolagem horizontal detectada. |
| Navegação e hidratação | Sem erros de JavaScript/hidratação; canonical atualizado; menu mobile e confirmação de idade preservados; grupo A → B → A testado com API atrasada. |
| Preservação de CSS | CSS compilado idêntico ao anterior: SHA-256 `8C98389ED0ADF438B0253F9AE030E654861FE09DC937F41AF469206C9C47714D`. |
| Lighthouse local final, perfil mobile | SEO 100/100; desempenho 84/100; LCP 1,8 s; CLS 0; TBT 580 ms. |

O Lighthouse usa um servidor local isolado com dados públicos copiados e não mede o banco, a rede ou a carga da Hostinger. Uma execução da versão anterior marcou desempenho 74/100 e SEO 100/100; houve variação entre execuções, portanto esses resultados não comprovam ganho de produção. TBT ainda merece acompanhamento. Core Web Vitals de campo não foram confirmados por CrUX/Search Console. Validade de JSON e coerência dos campos foram verificadas; a ferramenta externa Rich Results Test não foi executada.

As quatro capturas finais da home e do detalhe de grupo ficaram idênticas byte a byte nos dois tamanhos, após aguardar o carregamento e a decodificação das imagens. Imagens externas foram bloqueadas nos testes visuais locais, igualmente nas duas versões.

Foram corrigidos durante a validação dois riscos introduzidos pelo SSR: cache impedir a atualização de membros pela API e retorno SPA deixar o grupo inicial vazio até a resposta da API. Ambos possuem verificação de regressão aprovada. Testes visuais repetidos atingiram o limite HTTP do servidor local; a execução final usou uma instância nova, mantendo o limite de produção intacto.

Uma execução paralela final teve 37/39 aprovações: dois testes HTTP já existentes (`readiness` e autenticação administrativa) falharam com `fetch failed`, após timeout de conexão. Execuções paralelas anteriores passaram 39/39. O conjunto completo final, serializado em Node 22 e sem mudar o código dos testes existentes, passou 39/39. A causa da intermitência paralela não foi confirmada; deve ser acompanhada na repetição em CI/hospedagem. Não foi tratada como regressão funcional comprovada nem ocultada como aprovação daquela execução.

Limitações: não foram enviados cadastros, curtidas ou acessos a grupos de produção; não houve login administrativo nem teste de escrita real. Não houve conexão ao banco de produção pelo ambiente local, execução de migrations ou inspeção dos logs privados do servidor. HTTP na porta 80 não pôde ser validado desta máquina. Não foi possível verificar a conta do Search Console.

Evidências locais, ignoradas pelo Git: `tmp/seo-production-before.json`, `tmp/seo-sitemap-before.json`, `tmp/seo-local-all-routes.json`, `tmp/seo-browser-results.json`, `tmp/seo-visual-results.json`, `tmp/seo-tests-node22-final.tap` (39/39), `tmp/seo-tests-node22.tap` (execução paralela intermitente), `tmp/seo-lighthouse-final.json` e `tmp/seo-production-final-check.json`.

## 4. Deploy e rollback

**Deploy não realizado.** Não foi identificado acesso operacional ao hPanel, SSH configurado ou integração utilizável com a Hostinger nesta sessão. Também não foi possível confirmar a versão ativa e a versão recuperável no painel. Não houve push para disparar uma publicação sem conhecer esse fluxo.

Branch de trabalho: `main`. Referência local/remota no início: `995e217280b955ad7a14997039fd45637cfd4b67`. Esse SHA identifica o repositório, mas não comprova o commit ativo na Hostinger. Nenhum novo commit foi publicado em produção nesta auditoria. O SHA da versão local preparada pode ser consultado em `git log -1` após o registro das alterações.

O processo existente documentado para Hostinger Node.js Web App usa a raiz do repositório, Node 22, `npm run build:hostinger` e `npm start`, com entrada `backend/index.js`. A publicação deve incluir os dois diretórios gerados pelo mesmo build. As variáveis de ambiente existentes devem permanecer intactas.

Antes de publicar, confirmar no painel: aplicação/domínio, origem Git/branch, versão atualmente ativa, versão recuperável e backup existente. Depois, usar o fluxo de publicação já configurado. Em regressão crítica, republicar a versão anterior ou publicar um `git revert` pelo mesmo fluxo, sem push forçado e sem restaurar o banco para reverter apenas código. Não há migrations novas nesta entrega. Instruções estão em `DEPLOYMENT.md`.

Foi criado e verificado um backup local do histórico anterior em `tmp/seo-before-changes.bundle`, apontando para `995e217280b955ad7a14997039fd45637cfd4b67`. Esse backup de código não substitui a confirmação dos backups e das versões disponíveis na hospedagem.

A rechecagem final do domínio confirmou home e sitemap online, HTTP 200 e 57 URLs. A produção ainda mantém o corpo inicial vazio, comprovando que a correção local não foi publicada. Como não houve deploy, não existem verificações pós-deploy ou rollback de produção executados para declarar.

## 5. SEO e indexação

Sitemap atual: **57 URLs únicas = 36 grupos + 14 categorias + 7 páginas fixas**. Todas estão tecnicamente acessíveis em produção; na versão local corrigida, todas também entregam conteúdo real no HTML inicial.

Não foi comprovado bloqueio por canonical, `noindex`, `robots.txt` ou redirecionamento para a home nas URLs auditadas. A falta de corpo SSR era uma dependência técnica de renderização, não prova de exclusão do índice. Consultas manuais no Google não foram usadas para decidir se uma página está indexada.

Após a publicação, acompanhar na Inspeção de URL do Search Console: teste ao vivo, HTML renderizado, última leitura, status de rastreamento, canonical declarada e canonical escolhida pelo Google. Conferir os motivos de “Descoberta, atualmente não indexada” e “Rastreada, atualmente não indexada”, caso apareçam; revalidar o sitemap e solicitar indexação de uma amostra representativa após confirmar o HTML publicado. A decisão de indexar e selecionar canonical pertence ao Google. A classificação adulta permanece sujeita ao SafeSearch.

Referências oficiais consultadas: [SEO de JavaScript e renderização](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps e lastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [conteúdo adulto e SafeSearch](https://developers.google.com/search/docs/specialty/explicit/guidelines), [SSR no Vite](https://vite.dev/guide/ssr.html), [hidratação React](https://react.dev/reference/react-dom/client/hydrateRoot).

## 6. Preservação do projeto

Textos visíveis, nomes e descrições de grupos, títulos visíveis, imagens, ícones, fontes, CSS, cores, animações e estrutura visual foram preservados. O JSX que apresenta o conteúdo público não foi reescrito; os componentes existentes agora recebem os dados antes da primeira renderização.

Nenhum conteúdo cadastrado, dado de produção, variável de ambiente ou esquema do banco foi alterado por esta entrega. Os recursos e regras de acesso, envio, curtidas e administração foram mantidos. As mudanças de comportamento são técnicas: renderização inicial no servidor, hidratação, tratamento de URL malformada, consistência de metadados e revalidação do sitemap. Ajustes de sessão, navegação e agendamento da atualização de membros preservam os fluxos anteriores com SSR.
