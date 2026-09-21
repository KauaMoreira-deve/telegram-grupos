import conexao from '../config/database.js';
import { fetchTelegramMemberCount } from '../services/telegramService.js';
import { isValidEmail, isValidTelegramUrl, normalize } from '../utils/validation.js';

const publicSiteUrl = 'https://putarianotelegram.net';

function slugifyGroupName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'grupo';
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function logControllerError(error) {
  console.error('Falha em uma operação pública.', { code: error.code, name: error.name });
}

function submissionPayload(body) {
  const payload = {
    id_categoria: Number(body.id_categoria),
    nome_grupo: normalize(body.nome_grupo),
    descricao_grupo: normalize(body.descricao_grupo),
    link_telegram: normalize(body.link_telegram),
    nome_contato: normalize(body.nome_contato),
    email_contato: normalize(body.email_contato).toLowerCase(),
  };

  const validLengths = payload.nome_grupo.length <= 150
    && payload.descricao_grupo.length <= 5000
    && payload.nome_contato.length <= 150
    && payload.email_contato.length <= 254;

  return Number.isSafeInteger(payload.id_categoria)
    && payload.id_categoria > 0
    && payload.nome_grupo
    && payload.descricao_grupo
    && payload.nome_contato
    && isValidEmail(payload.email_contato)
    && validLengths
    && isValidTelegramUrl(payload.link_telegram)
    ? payload
    : null;
}

const groupMetricsJoin = `
  LEFT JOIN (
    SELECT id_grupo, COUNT(*) AS accesses
    FROM tbl_acesso_grupo
    GROUP BY id_grupo
  ) a ON a.id_grupo = g.id_grupo
`;

const groupLikesJoin = `
  LEFT JOIN (
    SELECT id_grupo, COUNT(*) AS likes
    FROM tbl_curtida_grupo
    GROUP BY id_grupo
  ) l ON l.id_grupo = g.id_grupo
`;

const groupHashtagsJoin = `
  LEFT JOIN (
    SELECT gh.id_grupo, GROUP_CONCAT(h.nome_hashtag ORDER BY h.nome_hashtag SEPARATOR ',') AS hashtags
    FROM tbl_grupo_hashtag gh
    JOIN tbl_hashtag h ON h.id_hashtag = gh.id_hashtag
    GROUP BY gh.id_grupo
  ) h ON h.id_grupo = g.id_grupo
`;

const publicGroupFields = `
  g.id_grupo AS id, g.nome_grupo AS name, c.nome_categoria AS category,
  c.url_categoria AS categoryUrl, g.descricao_grupo AS description,
  g.url_imagem AS image, g.link_telegram AS link, g.destaque_grupo AS featured,
  g.quantidade_membros AS members, COALESCE(a.accesses, 0) AS accesses,
  COALESCE(l.likes, 0) AS likes,
  DATE_FORMAT(g.data_criacao_grupo, '%d/%m/%Y') AS createdAt,
  DATE_FORMAT(g.data_criacao_grupo, '%Y-%m-%dT%H:%i:%s') AS createdAtIso,
  DATE_FORMAT(g.data_atualizacao_membros, '%d/%m/%Y %H:%i') AS membersUpdatedAt,
  COALESCE(h.hashtags, '') AS hashtags
`;

function serializePublicGroup(group) {
  return {
    ...group,
    featured: Boolean(group.featured),
    hashtags: group.hashtags ? group.hashtags.split(',') : [],
  };
}

let memberRefreshPromise = null;

async function refreshStaleMemberCounts(groupId = null) {
  if (memberRefreshPromise) return memberRefreshPromise;

  memberRefreshPromise = (async () => {
    const parameters = [];
    let whereGroup = '';
    if (groupId) {
      whereGroup = 'AND g.id_grupo = ?';
      parameters.push(groupId);
    }

    const [groups] = await conexao.query(
      `SELECT g.id_grupo AS id, g.link_telegram AS link
       FROM tbl_grupo_telegram g
       WHERE g.status_grupo = 'ativo'
         ${whereGroup}
         AND (g.data_atualizacao_membros IS NULL OR g.data_atualizacao_membros < DATE_SUB(NOW(), INTERVAL 24 HOUR))
       ORDER BY g.data_atualizacao_membros IS NULL DESC, g.id_grupo DESC
       LIMIT 12`,
      parameters,
    );

    await Promise.allSettled(groups.map(async (group) => {
      try {
        const members = await fetchTelegramMemberCount(group.link);
        if (members === null) {
          await conexao.query('UPDATE tbl_grupo_telegram SET data_atualizacao_membros = NOW() WHERE id_grupo = ?', [group.id]);
        } else {
          await conexao.query(
            'UPDATE tbl_grupo_telegram SET quantidade_membros = ?, data_atualizacao_membros = NOW() WHERE id_grupo = ?',
            [members, group.id],
          );
        }
      } catch (error) {
        console.warn('Não foi possível atualizar os membros de um grupo.', {
          groupId: group.id,
          code: error.code,
          name: error.name,
        });
      }
    }));
  })().finally(() => {
    memberRefreshPromise = null;
  });

  return memberRefreshPromise;
}

export const getPublicGroups = async (_req, res) => {
  try {
    void refreshStaleMemberCounts().catch(logControllerError);
    const [groups] = await conexao.query(`
      SELECT ${publicGroupFields}
      FROM tbl_grupo_telegram g
      JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
      ${groupMetricsJoin}
      ${groupLikesJoin}
      ${groupHashtagsJoin}
      WHERE g.status_grupo = 'ativo' AND c.status_categoria = 'ativo'
      ORDER BY g.destaque_grupo DESC, g.id_grupo DESC
    `);
    res.json(groups.map(serializePublicGroup));
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao buscar grupos públicos.' });
  }
};

export const getSitemap = async (_req, res) => {
  try {
    const [groupsResult, categoriesResult] = await Promise.all([
      conexao.query(`
        SELECT g.id_grupo AS id, g.nome_grupo AS name,
          DATE_FORMAT(g.data_criacao_grupo, '%Y-%m-%d') AS lastModified
        FROM tbl_grupo_telegram g
        JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
        WHERE g.status_grupo = 'ativo' AND c.status_categoria = 'ativo'
        ORDER BY g.id_grupo DESC
      `),
      conexao.query(`
        SELECT DISTINCT c.url_categoria AS url
        FROM tbl_categoria c
        JOIN tbl_grupo_telegram g ON g.id_categoria = c.id_categoria
        WHERE c.status_categoria = 'ativo' AND g.status_grupo = 'ativo'
        ORDER BY c.url_categoria
      `),
    ]);

    const urls = [
      { path: '/', changeFrequency: 'daily', priority: '1.0' },
      { path: '/adicionar-grupo', changeFrequency: 'monthly', priority: '0.6' },
      { path: '/termos-de-uso', changeFrequency: 'monthly', priority: '0.3' },
      ...categoriesResult[0].map((category) => ({
        path: `/categorias/${encodeURIComponent(category.url)}`,
        changeFrequency: 'daily',
        priority: '0.8',
      })),
      ...groupsResult[0].map((group) => ({
        path: `/grupos/${encodeURIComponent(slugifyGroupName(group.name))}-${group.id}`,
        changeFrequency: 'weekly',
        priority: '0.7',
        lastModified: group.lastModified,
      })),
    ];

    const entries = urls.map((url) => [
      '  <url>',
      `    <loc>${escapeXml(new URL(url.path, publicSiteUrl).toString())}</loc>`,
      url.lastModified ? `    <lastmod>${escapeXml(url.lastModified)}</lastmod>` : '',
      `    <changefreq>${url.changeFrequency}</changefreq>`,
      `    <priority>${url.priority}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')).join('\n');

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
  } catch (error) {
    logControllerError(error);
    res.status(500).type('text/plain').send('Não foi possível gerar o sitemap.');
  }
};

export const getPublicGroupById = async (req, res) => {
  try {
    void refreshStaleMemberCounts(req.params.id).catch(logControllerError);
    const [groups] = await conexao.query(
      `SELECT ${publicGroupFields}
       FROM tbl_grupo_telegram g
       JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
       ${groupMetricsJoin}
       ${groupLikesJoin}
       ${groupHashtagsJoin}
       WHERE g.id_grupo = ? AND g.status_grupo = 'ativo' AND c.status_categoria = 'ativo'`,
      [req.params.id],
    );

    if (!groups.length) return res.status(404).json({ erro: 'Grupo não encontrado.' });
    res.json(serializePublicGroup(groups[0]));
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao buscar grupo público.' });
  }
};

export const getPublicStats = async (_req, res) => {
  try {
    const [groupsResult, categoriesResult, accessesResult] = await Promise.all([
      conexao.query(`
        SELECT COUNT(*) AS totalGroups, COALESCE(SUM(g.quantidade_membros), 0) AS totalMembers
        FROM tbl_grupo_telegram g
        JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
        WHERE g.status_grupo = 'ativo' AND c.status_categoria = 'ativo'
      `),
      conexao.query(`
        SELECT COUNT(*) AS totalCategories
        FROM tbl_categoria c
        WHERE c.status_categoria = 'ativo'
          AND EXISTS (
            SELECT 1 FROM tbl_grupo_telegram g
            WHERE g.id_categoria = c.id_categoria AND g.status_grupo = 'ativo'
          )
      `),
      conexao.query(`
        SELECT COUNT(*) AS totalAccesses
        FROM tbl_acesso_grupo a
        JOIN tbl_grupo_telegram g ON g.id_grupo = a.id_grupo
        JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
        WHERE g.status_grupo = 'ativo' AND c.status_categoria = 'ativo'
      `),
    ]);

    res.json({
      totalGroups: groupsResult[0][0].totalGroups,
      totalMembers: groupsResult[0][0].totalMembers,
      totalCategories: categoriesResult[0][0].totalCategories,
      totalAccesses: accessesResult[0][0].totalAccesses,
    });
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas públicas.' });
  }
};

export const getPublicCategories = async (_req, res) => {
  try {
    const [categories] = await conexao.query(`SELECT c.id_categoria AS id, c.nome_categoria AS name, c.url_categoria AS url, COUNT(g.id_grupo) AS groupCount FROM tbl_categoria c LEFT JOIN tbl_grupo_telegram g ON g.id_categoria = c.id_categoria AND g.status_grupo = 'ativo' WHERE c.status_categoria = 'ativo' GROUP BY c.id_categoria HAVING groupCount > 0 ORDER BY c.nome_categoria`);
    res.json(categories);
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao buscar categorias públicas.' });
  }
};

export const getSubmissionCategories = async (_req, res) => {
  try {
    const [categories] = await conexao.query(`
      SELECT id_categoria AS id, nome_categoria AS name, url_categoria AS url
      FROM tbl_categoria
      WHERE status_categoria = 'ativo'
      ORDER BY nome_categoria
    `);
    res.json(categories);
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao buscar categorias.' });
  }
};

export const getFooterCatalog = async (_req, res) => {
  try {
    const [categories, hashtags] = await Promise.all([
      conexao.query(`
        SELECT DISTINCT c.id_categoria AS id, c.nome_categoria AS name, c.url_categoria AS url
        FROM tbl_categoria c
        JOIN tbl_grupo_telegram g ON g.id_categoria = c.id_categoria
        WHERE c.status_categoria = 'ativo' AND g.status_grupo = 'ativo'
        ORDER BY c.nome_categoria
      `),
      conexao.query(`
        SELECT DISTINCT h.nome_hashtag AS name
        FROM tbl_hashtag h
        JOIN tbl_grupo_hashtag gh ON gh.id_hashtag = h.id_hashtag
        JOIN tbl_grupo_telegram g ON g.id_grupo = gh.id_grupo
        JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
        WHERE g.status_grupo = 'ativo' AND c.status_categoria = 'ativo'
        ORDER BY h.nome_hashtag
      `),
    ]);
    res.json({ categories: categories[0], hashtags: hashtags[0].map((hashtag) => hashtag.name) });
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao buscar o catalogo do rodape.' });
  }
};

export const createGroupSubmission = async (req, res) => {
  const submission = submissionPayload(req.body);
  if (!submission) return res.status(400).json({ erro: 'Preencha os campos obrigatorios com dados validos.' });

  const connection = await conexao.getConnection();
  try {
    await connection.beginTransaction();
    const [[category]] = await connection.query(
      "SELECT id_categoria FROM tbl_categoria WHERE id_categoria = ? AND status_categoria = 'ativo' FOR UPDATE",
      [submission.id_categoria],
    );
    if (!category) {
      await connection.rollback();
      return res.status(400).json({ erro: 'Selecione uma categoria ativa.' });
    }

    const [[existing]] = await connection.query(
      `SELECT 1 AS found
       FROM tbl_grupo_telegram WHERE link_telegram = ?
       UNION ALL
       SELECT 1 AS found FROM tbl_solicitacao_grupo
       WHERE link_telegram = ? AND status_solicitacao = 'pendente'
       LIMIT 1`,
      [submission.link_telegram, submission.link_telegram],
    );
    if (existing) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Este grupo ja esta cadastrado ou aguardando analise.' });
    }

    const [result] = await connection.query(
      `INSERT INTO tbl_solicitacao_grupo
       (id_categoria, nome_grupo, descricao_grupo, link_telegram, nome_contato, email_contato)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        submission.id_categoria,
        submission.nome_grupo,
        submission.descricao_grupo,
        submission.link_telegram,
        submission.nome_contato,
        submission.email_contato,
      ],
    );
    await connection.commit();
    res.status(201).json({ id: result.insertId, mensagem: 'Grupo enviado para analise. Avisaremos pelo e-mail informado.' });
  } catch (error) {
    await connection.rollback();
    logControllerError(error);
    res.status(500).json({ erro: 'Nao foi possivel enviar o grupo. Tente novamente.' });
  } finally {
    connection.release();
  }
};

export const registerGroupAccess = async (req, res) => {
  try {
    const [group] = await conexao.query("SELECT id_grupo FROM tbl_grupo_telegram WHERE id_grupo = ? AND status_grupo = 'ativo'", [req.params.id]);
    if (!group.length) return res.status(404).json({ erro: 'Grupo não encontrado.' });
    await conexao.query('INSERT INTO tbl_acesso_grupo (id_grupo) VALUES (?)', [req.params.id]);
    res.status(201).json({ mensagem: 'Acesso registrado.' });
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao registrar acesso.' });
  }
};

export const registerGroupLike = async (req, res) => {
  const visitorId = normalize(req.body?.visitorId);
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
    return res.status(400).json({ erro: 'Identificador de visitante invalido.' });
  }

  try {
    const [groups] = await conexao.query(
      "SELECT id_grupo FROM tbl_grupo_telegram WHERE id_grupo = ? AND status_grupo = 'ativo'",
      [req.params.id],
    );
    if (!groups.length) return res.status(404).json({ erro: 'Grupo nao encontrado.' });

    const [result] = await conexao.query(
      'INSERT IGNORE INTO tbl_curtida_grupo (id_grupo, identificador_visitante) VALUES (?, ?)',
      [req.params.id, visitorId],
    );
    const [[count]] = await conexao.query(
      'SELECT COUNT(*) AS likes FROM tbl_curtida_grupo WHERE id_grupo = ?',
      [req.params.id],
    );

    res.status(result.affectedRows ? 201 : 200).json({ likes: count.likes, liked: true });
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao registrar curtida.' });
  }
};

export const getGroupLikeStatus = async (req, res) => {
  const visitorId = normalize(req.query.visitorId);
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
    return res.status(400).json({ erro: 'Identificador de visitante invalido.' });
  }

  try {
    const [[group]] = await conexao.query(
      "SELECT id_grupo FROM tbl_grupo_telegram WHERE id_grupo = ? AND status_grupo = 'ativo'",
      [req.params.id],
    );
    if (!group) return res.status(404).json({ erro: 'Grupo nao encontrado.' });

    const [[status]] = await conexao.query(
      `SELECT COUNT(*) AS likes,
        COALESCE(MAX(identificador_visitante = ?), 0) AS liked
       FROM tbl_curtida_grupo
       WHERE id_grupo = ?`,
      [visitorId, req.params.id],
    );
    res.json({ likes: Number(status.likes) || 0, liked: Boolean(status.liked) });
  } catch (error) {
    logControllerError(error);
    res.status(500).json({ erro: 'Erro ao consultar curtidas.' });
  }
};
