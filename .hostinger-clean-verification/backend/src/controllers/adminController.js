import bcrypt from "bcrypt";
import conexao from "../config/database.js";
import { fetchTelegramMemberCount } from "../services/telegramService.js";
import { isValidEmail, isValidPassword, isValidSlug, isValidTelegramUrl, normalize } from "../utils/validation.js";

const STATUS = new Set(["ativo", "inativo"]);
const ROLES = new Set(["superadmin", "editor"]);
const MAX_HASHTAGS = 3;

function normalizeHashtags(value) {
  const rawTags = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[\n,]/);
  const tags = rawTags
    .map((tag) =>
      normalize(tag).replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-"),
    )
    .filter((tag) => tag && tag.length <= 60 && /^[\p{L}\p{N}_-]+$/u.test(tag));
  return [...new Set(tags)].slice(0, MAX_HASHTAGS);
}

async function saveGroupHashtags(groupId, hashtags) {
  await conexao.query("DELETE FROM tbl_grupo_hashtag WHERE id_grupo = ?", [
    groupId,
  ]);
  if (!hashtags.length) return;

  for (const hashtag of hashtags) {
    await conexao.query(
      "INSERT INTO tbl_hashtag (nome_hashtag) VALUES (?) ON DUPLICATE KEY UPDATE nome_hashtag = VALUES(nome_hashtag)",
      [hashtag],
    );
  }

  const placeholders = hashtags.map(() => "?").join(", ");
  const [rows] = await conexao.query(
    `SELECT id_hashtag FROM tbl_hashtag WHERE nome_hashtag IN (${placeholders})`,
    hashtags,
  );
  await conexao.query(
    "INSERT INTO tbl_grupo_hashtag (id_grupo, id_hashtag) VALUES ?",
    [rows.map(({ id_hashtag: hashtagId }) => [groupId, hashtagId])],
  );
}

function groupSlug(value) {
  return (
    normalize(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 170) || "grupo"
  );
}

function databaseError(res, error, fallback) {
  console.error('Falha em uma operação de banco.', { code: error.code, name: error.name });
  if (
    error.code === "ER_DUP_ENTRY" &&
    /uq_grupo_link_telegram|link_telegram/i.test(
      error.sqlMessage || error.message,
    )
  ) {
    return res
      .status(409)
      .json({ erro: "Já existe um grupo com este link do Telegram." });
  }
  if (
    error.code === "ER_DUP_ENTRY" &&
    /uq_grupo_url|url_grupo/i.test(error.sqlMessage || error.message)
  ) {
    return res
      .status(409)
      .json({
        erro: "O banco ainda está usando a URL do grupo como única. Execute as migrations para permitir URLs diferentes.",
      });
  }
  if (error.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ erro: "Já existe um registro com esses dados." });
  if (error.code === "ER_ROW_IS_REFERENCED_2")
    return res
      .status(409)
      .json({ erro: "Este registro possui vínculos e não pode ser excluído." });
  return res.status(500).json({ erro: fallback });
}

function groupPayload(body) {
  const memberValue = normalize(body.quantidade_membros);
  const payload = {
    nome_grupo: normalize(body.nome_grupo),
    id_categoria: Number(body.id_categoria),
    url_grupo: normalize(body.url_grupo).toLowerCase(),
    descricao_grupo: normalize(body.descricao_grupo),
    link_telegram: normalize(body.link_telegram),
    quantidade_membros: memberValue === "" ? null : Number(memberValue),
    status_grupo: normalize(body.status_grupo || "ativo").toLowerCase(),
    destaque_grupo:
      body.destaque_grupo === "sim" ||
      body.destaque_grupo === true ||
      body.destaque_grupo === 1
        ? 1
        : 0,
    hashtags: normalizeHashtags(body.hashtags),
  };
  const validMembers =
    payload.quantidade_membros === null ||
    (Number.isSafeInteger(payload.quantidade_membros) &&
      payload.quantidade_membros >= 0 &&
      payload.quantidade_membros <= 4_294_967_295);
  return payload.nome_grupo && payload.nome_grupo.length <= 150 &&
    Number.isSafeInteger(payload.id_categoria) && payload.id_categoria > 0 &&
    isValidSlug(payload.url_grupo, 180) &&
    payload.descricao_grupo && payload.descricao_grupo.length <= 5_000 &&
    isValidTelegramUrl(payload.link_telegram) &&
    validMembers &&
    STATUS.has(payload.status_grupo)
    ? payload
    : null;
}

function categoryPayload(body) {
  const payload = {
    nome_categoria: normalize(body.nome_categoria),
    url_categoria: normalize(body.url_categoria).toLowerCase(),
    status_categoria: normalize(body.status_categoria || "ativo").toLowerCase(),
  };
  return payload.nome_categoria && payload.nome_categoria.length <= 100 &&
    isValidSlug(payload.url_categoria, 120) &&
    STATUS.has(payload.status_categoria)
    ? payload
    : null;
}

async function syncMemberCount(groupId, telegramLink) {
  const members = await fetchTelegramMemberCount(telegramLink);

  if (members === null) {
    await conexao.query(
      "UPDATE tbl_grupo_telegram SET data_atualizacao_membros = ? WHERE id_grupo = ?",
      [new Date(), groupId],
    );
  } else {
    await conexao.query(
      "UPDATE tbl_grupo_telegram SET quantidade_membros = ?, data_atualizacao_membros = ? WHERE id_grupo = ?",
      [members, new Date(), groupId],
    );
  }

  return members;
}

function memberSyncMessage(members) {
  return members === null
    ? "O grupo foi salvo, mas o Telegram não disponibiliza a quantidade de membros neste link."
    : `Quantidade de membros atualizada: ${members}.`;
}

export const getDashboardStats = async (_req, res) => {
  try {
    const [
      [totalGroups],
      [activeGroups],
      [totalCategories],
      [totalAcessos],
      recentGroups,
    ] = await Promise.all([
      conexao.query("SELECT COUNT(*) AS count FROM tbl_grupo_telegram"),
      conexao.query(
        "SELECT COUNT(*) AS count FROM tbl_grupo_telegram WHERE status_grupo = 'ativo'",
      ),
      conexao.query("SELECT COUNT(*) AS count FROM tbl_categoria"),
      conexao.query("SELECT COUNT(*) AS count FROM tbl_acesso_grupo"),
      conexao.query(
        `SELECT g.id_grupo AS id, g.nome_grupo AS name, c.nome_categoria AS category, g.status_grupo AS status, DATE_FORMAT(g.data_criacao_grupo, '%d/%m/%Y') AS date FROM tbl_grupo_telegram g JOIN tbl_categoria c ON c.id_categoria = g.id_categoria ORDER BY g.id_grupo DESC LIMIT 4`,
      ),
    ]);
    res.json({
      stats: {
        totalGroups: totalGroups[0].count,
        activeGroups: activeGroups[0].count,
        totalCategories: totalCategories[0].count,
        totalAcessos: totalAcessos[0].count,
      },
      recentGroups: recentGroups[0].map((group) => ({
        ...group,
        status: group.status === "ativo" ? "Ativo" : "Inativo",
      })),
    });
  } catch (error) {
    databaseError(res, error, "Erro ao buscar estatísticas.");
  }
};

export const getGroups = async (_req, res) => {
  try {
    const [groups] = await conexao.query(`
      SELECT g.id_grupo AS id, g.id_categoria AS categoryId, g.nome_grupo AS name,
        c.nome_categoria AS category, g.url_grupo AS slug, g.descricao_grupo AS description,
        g.link_telegram AS telegramLink, g.url_imagem AS imageUrl, g.status_grupo AS status,
        g.destaque_grupo AS featured, g.quantidade_membros AS members,
        DATE_FORMAT(g.data_criacao_grupo, '%d/%m/%Y') AS date,
        DATE_FORMAT(g.data_atualizacao_membros, '%d/%m/%Y %H:%i') AS membersUpdatedAt,
        COALESCE(a.accesses, 0) AS accesses
      FROM tbl_grupo_telegram g
      JOIN tbl_categoria c ON c.id_categoria = g.id_categoria
      LEFT JOIN (
        SELECT id_grupo, COUNT(*) AS accesses
        FROM tbl_acesso_grupo
        GROUP BY id_grupo
      ) a ON a.id_grupo = g.id_grupo
      ORDER BY g.id_grupo DESC
    `);
    res.json(
      groups.map((group) => ({
        ...group,
        featured: Boolean(group.featured),
        status: group.status === "ativo" ? "Ativo" : "Inativo",
      })),
    );
  } catch (error) {
    databaseError(res, error, "Erro ao buscar grupos.");
  }
};

export const getGroup = async (req, res) => {
  try {
    const [groups] = await conexao.query(
      "SELECT * FROM tbl_grupo_telegram WHERE id_grupo = ?",
      [req.params.id],
    );
    if (!groups.length)
      return res.status(404).json({ erro: "Grupo não encontrado." });
    const [hashtags] = await conexao.query(
      `
      SELECT h.nome_hashtag AS name
      FROM tbl_grupo_hashtag gh
      JOIN tbl_hashtag h ON h.id_hashtag = gh.id_hashtag
      WHERE gh.id_grupo = ?
      ORDER BY h.nome_hashtag
    `,
      [req.params.id],
    );
    res.json({
      ...groups[0],
      hashtags: hashtags.map((hashtag) => hashtag.name),
    });
  } catch (error) {
    databaseError(res, error, "Erro ao buscar grupo.");
  }
};

export const createGroup = async (req, res) => {
  const group = groupPayload(req.body);
  if (!group)
    return res
      .status(400)
      .json({
        erro: "Preencha todos os campos obrigatórios com valores válidos.",
      });
  try {
    const [[duplicateLink]] = await conexao.query(
      "SELECT id_grupo FROM tbl_grupo_telegram WHERE link_telegram = ? LIMIT 1",
      [group.link_telegram],
    );
    if (duplicateLink)
      return res
        .status(409)
        .json({ erro: "Já existe um grupo com este link do Telegram." });
    const [result] = await conexao.query(
      "INSERT INTO tbl_grupo_telegram (nome_grupo, id_categoria, url_grupo, descricao_grupo, link_telegram, quantidade_membros, data_atualizacao_membros, status_grupo, destaque_grupo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        group.nome_grupo,
        group.id_categoria,
        group.url_grupo,
        group.descricao_grupo,
        group.link_telegram,
        group.quantidade_membros,
        group.quantidade_membros === null ? null : new Date(),
        group.status_grupo,
        group.destaque_grupo,
      ],
    );
    await saveGroupHashtags(result.insertId, group.hashtags);
    let members = null;
    let syncWarning = "";
    if (group.quantidade_membros === null) {
      try {
        members = await syncMemberCount(result.insertId, group.link_telegram);
      } catch (error) {
        console.warn("Não foi possível sincronizar os membros do Telegram.", {
          code: error.code,
          name: error.name,
        });
        syncWarning =
          " O grupo foi criado, mas a atualização dos membros falhou.";
      }
    } else members = group.quantidade_membros;
    res
      .status(201)
      .json({
        id: result.insertId,
        members,
        mensagem:
          `Grupo criado com sucesso. ${syncWarning || memberSyncMessage(members)}`.trim(),
      });
  } catch (error) {
    databaseError(res, error, "Erro ao criar grupo.");
  }
};

export const updateGroup = async (req, res) => {
  const group = groupPayload(req.body);
  if (!group)
    return res
      .status(400)
      .json({
        erro: "Preencha todos os campos obrigatórios com valores válidos.",
      });
  try {
    const [[duplicateLink]] = await conexao.query(
      "SELECT id_grupo FROM tbl_grupo_telegram WHERE link_telegram = ? AND id_grupo <> ? LIMIT 1",
      [group.link_telegram, req.params.id],
    );
    if (duplicateLink)
      return res
        .status(409)
        .json({ erro: "Já existe outro grupo com este link do Telegram." });
    const [result] = await conexao.query(
      "UPDATE tbl_grupo_telegram SET nome_grupo = ?, id_categoria = ?, url_grupo = ?, descricao_grupo = ?, link_telegram = ?, status_grupo = ?, destaque_grupo = ?, quantidade_membros = ?, data_atualizacao_membros = ? WHERE id_grupo = ?",
      [
        group.nome_grupo,
        group.id_categoria,
        group.url_grupo,
        group.descricao_grupo,
        group.link_telegram,
        group.status_grupo,
        group.destaque_grupo,
        group.quantidade_membros,
        group.quantidade_membros === null ? null : new Date(),
        req.params.id,
      ],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Grupo não encontrado." });
    await saveGroupHashtags(req.params.id, group.hashtags);
    let members = null;
    let syncWarning = "";
    if (group.quantidade_membros === null) {
      try {
        members = await syncMemberCount(req.params.id, group.link_telegram);
      } catch (error) {
        console.warn("Não foi possível sincronizar os membros do Telegram.", {
          code: error.code,
          name: error.name,
        });
        syncWarning =
          " O grupo foi atualizado, mas a atualização dos membros falhou.";
      }
    } else members = group.quantidade_membros;
    res.json({
      members,
      mensagem:
        `Grupo atualizado com sucesso. ${syncWarning || memberSyncMessage(members)}`.trim(),
    });
  } catch (error) {
    databaseError(res, error, "Erro ao atualizar grupo.");
  }
};

export const syncGroupMembers = async (req, res) => {
  try {
    const [groups] = await conexao.query(
      "SELECT link_telegram FROM tbl_grupo_telegram WHERE id_grupo = ?",
      [req.params.id],
    );
    if (!groups.length)
      return res.status(404).json({ erro: "Grupo não encontrado." });

    const members = await syncMemberCount(
      req.params.id,
      groups[0].link_telegram,
    );
    res.json({ members, mensagem: memberSyncMessage(members) });
  } catch (error) {
    console.error('Falha ao sincronizar membros.', { code: error.code, name: error.name });
    res
      .status(502)
      .json({
        erro: "Não foi possível consultar os membros no Telegram. Tente novamente mais tarde.",
      });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const [result] = await conexao.query(
      "DELETE FROM tbl_grupo_telegram WHERE id_grupo = ?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Grupo não encontrado." });
    res.json({ mensagem: "Grupo excluído com sucesso." });
  } catch (error) {
    databaseError(res, error, "Erro ao excluir grupo.");
  }
};

export const getCategories = async (_req, res) => {
  try {
    const [categories] = await conexao.query(
      `SELECT c.id_categoria AS id, c.nome_categoria AS name, c.url_categoria AS url, c.status_categoria AS status, COUNT(g.id_grupo) AS groupCount FROM tbl_categoria c LEFT JOIN tbl_grupo_telegram g ON g.id_categoria = c.id_categoria GROUP BY c.id_categoria ORDER BY c.nome_categoria`,
    );
    res.json(
      categories.map((category) => ({
        ...category,
        status: category.status === "ativo" ? "Ativo" : "Inativo",
      })),
    );
  } catch (error) {
    databaseError(res, error, "Erro ao buscar categorias.");
  }
};

export const getGroupCategories = async (req, res) => {
  try {
    const [categories] = await conexao.query(
      "SELECT c.id_categoria AS id, c.nome_categoria AS name, c.url_categoria AS url, c.status_categoria AS status FROM tbl_categoria c JOIN tbl_grupo_telegram g ON g.id_categoria = c.id_categoria WHERE g.id_grupo = ?",
      [req.params.id],
    );
    res.json(categories);
  } catch (error) {
    databaseError(res, error, "Erro ao buscar categorias do grupo.");
  }
};

export const createCategory = async (req, res) => {
  const category = categoryPayload(req.body);
  if (!category)
    return res
      .status(400)
      .json({ erro: "Nome, URL e status válidos são obrigatórios." });
  try {
    const [result] = await conexao.query(
      "INSERT INTO tbl_categoria (nome_categoria, url_categoria, status_categoria) VALUES (?, ?, ?)",
      [
        category.nome_categoria,
        category.url_categoria,
        category.status_categoria,
      ],
    );
    res
      .status(201)
      .json({ id: result.insertId, mensagem: "Categoria criada com sucesso." });
  } catch (error) {
    databaseError(res, error, "Erro ao criar categoria.");
  }
};

export const updateCategory = async (req, res) => {
  const category = categoryPayload(req.body);
  if (!category)
    return res
      .status(400)
      .json({ erro: "Nome, URL e status válidos são obrigatórios." });
  try {
    const [result] = await conexao.query(
      "UPDATE tbl_categoria SET nome_categoria = ?, url_categoria = ?, status_categoria = ? WHERE id_categoria = ?",
      [
        category.nome_categoria,
        category.url_categoria,
        category.status_categoria,
        req.params.id,
      ],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Categoria não encontrada." });
    res.json({ mensagem: "Categoria atualizada com sucesso." });
  } catch (error) {
    databaseError(res, error, "Erro ao atualizar categoria.");
  }
};

export const deleteCategory = async (req, res) => {
  const connection = await conexao.getConnection();
  try {
    await connection.beginTransaction();
    const [[category]] = await connection.query(
      "SELECT id_categoria FROM tbl_categoria WHERE id_categoria = ? FOR UPDATE",
      [req.params.id],
    );
    if (!category) {
      await connection.rollback();
      return res.status(404).json({ erro: "Categoria não encontrada." });
    }

    const [[usage]] = await connection.query(
      "SELECT COUNT(*) AS count FROM tbl_grupo_telegram WHERE id_categoria = ?",
      [req.params.id],
    );
    if (Number(usage.count)) {
      await connection.rollback();
      return res
        .status(409)
        .json({
          erro: "Esta categoria está vinculada a grupos. Reatribua ou exclua os grupos antes de removê-la.",
        });
    }

    await connection.query(
      `UPDATE tbl_solicitacao_grupo
       SET id_categoria = NULL,
         status_solicitacao = CASE
           WHEN status_solicitacao = 'pendente' THEN 'recusada'
           ELSE status_solicitacao
         END
       WHERE id_categoria = ?`,
      [req.params.id],
    );
    const [result] = await connection.query(
      "DELETE FROM tbl_categoria WHERE id_categoria = ?",
      [req.params.id],
    );
    await connection.commit();
    res.json({ mensagem: "Categoria excluída com sucesso." });
  } catch (error) {
    await connection.rollback();
    databaseError(res, error, "Erro ao excluir categoria.");
  } finally {
    connection.release();
  }
};

export const getUsers = async (_req, res) => {
  try {
    const [users] = await conexao.query(
      `SELECT id_usuario AS id, nome_usuario AS name, email_usuario AS email,
        status_usuario AS status, papel_usuario AS role
       FROM tbl_usuario
       ORDER BY id_usuario DESC`,
    );
    res.json(
      users.map((user) => ({
        ...user,
        status: user.status === "ativo" ? "Ativo" : "Inativo",
      })),
    );
  } catch (error) {
    databaseError(res, error, "Erro ao buscar usuários.");
  }
};

export const updateOwnProfile = async (req, res) => {
  const name = normalize(req.body.nome_usuario);
  const email = normalize(req.body.email_usuario).toLowerCase();
  const password = String(req.body.senha_usuario ?? "");
  if (
    !name || name.length > 150 ||
    !isValidEmail(email) ||
    !isValidPassword(password, { required: false })
  ) {
    return res.status(400).json({
      erro: "Informe nome, e-mail e, se preenchida, uma senha válida (8 a 72 bytes).",
    });
  }

  try {
    const parameters = [name, email];
    let query = "UPDATE tbl_usuario SET nome_usuario = ?, email_usuario = ?";
    if (password) {
      query += ", senha_usuario = ?";
      parameters.push(await bcrypt.hash(password, 12));
    }
    query += " WHERE id_usuario = ? AND status_usuario = 'ativo'";
    parameters.push(req.admin.id);
    const [result] = await conexao.query(query, parameters);
    if (!result.affectedRows) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }
    return res.json({ mensagem: "Configurações atualizadas com sucesso." });
  } catch (error) {
    return databaseError(res, error, "Erro ao atualizar as configurações.");
  }
};

export const createUser = async (req, res) => {
  const name = normalize(req.body.nome_usuario);
  const email = normalize(req.body.email_usuario).toLowerCase();
  const password = String(req.body.senha_usuario ?? "");
  const status = normalize(req.body.status_usuario || "ativo").toLowerCase();
  const role = normalize(req.body.papel_usuario || req.body.role || "editor").toLowerCase();
  if (
    !name || name.length > 150 ||
    !isValidEmail(email) ||
    !isValidPassword(password) ||
    !STATUS.has(status) ||
    !ROLES.has(role)
  )
    return res
      .status(400)
      .json({
        erro: "Informe nome, e-mail, perfil e senha válidos (8 a 72 bytes).",
      });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await conexao.query(
      "INSERT INTO tbl_usuario (nome_usuario, email_usuario, senha_usuario, status_usuario, papel_usuario) VALUES (?, ?, ?, ?, ?)",
      [name, email, hash, status, role],
    );
    res
      .status(201)
      .json({ id: result.insertId, mensagem: "Usuário criado com sucesso." });
  } catch (error) {
    databaseError(res, error, "Erro ao criar usuário.");
  }
};

export const updateUser = async (req, res) => {
  const name = normalize(req.body.nome_usuario);
  const email = normalize(req.body.email_usuario).toLowerCase();
  const password = String(req.body.senha_usuario ?? "");
  const status = normalize(req.body.status_usuario || "ativo").toLowerCase();
  const requestedRole = normalize(req.body.papel_usuario || req.body.role).toLowerCase();
  if (
    !name || name.length > 150 ||
    !isValidEmail(email) ||
    !isValidPassword(password, { required: false }) ||
    !STATUS.has(status) ||
    (requestedRole && !ROLES.has(requestedRole))
  )
    return res
      .status(400)
      .json({
        erro: "Informe nome, e-mail, perfil e, se preenchida, uma senha válida (8 a 72 bytes).",
      });
  try {
    const [[currentUser]] = await conexao.query(
      "SELECT id_usuario, status_usuario, papel_usuario FROM tbl_usuario WHERE id_usuario = ?",
      [req.params.id],
    );
    if (!currentUser) return res.status(404).json({ erro: "Usuário não encontrado." });

    const role = requestedRole || currentUser.papel_usuario;
    const isSelf = String(req.admin.id) === String(req.params.id);
    if (isSelf && (status !== 'ativo' || role !== 'superadmin')) {
      return res.status(409).json({ erro: "Você não pode desativar ou rebaixar a própria conta." });
    }
    if (currentUser.papel_usuario === 'superadmin'
      && currentUser.status_usuario === 'ativo'
      && (role !== 'superadmin' || status !== 'ativo')) {
      const [[superAdmins]] = await conexao.query(
        "SELECT COUNT(*) AS count FROM tbl_usuario WHERE papel_usuario = 'superadmin' AND status_usuario = 'ativo'",
      );
      if (Number(superAdmins.count) <= 1) {
        return res.status(409).json({ erro: "Mantenha pelo menos um superadministrador ativo." });
      }
    }

    const parameters = [name, email, status, role];
    let query =
      "UPDATE tbl_usuario SET nome_usuario = ?, email_usuario = ?, status_usuario = ?, papel_usuario = ?";
    if (password) {
      query += ", senha_usuario = ?";
      parameters.push(await bcrypt.hash(password, 12));
    }
    query += " WHERE id_usuario = ?";
    parameters.push(req.params.id);
    const [result] = await conexao.query(query, parameters);
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Usuário não encontrado." });
    res.json({ mensagem: "Usuário atualizado com sucesso." });
  } catch (error) {
    databaseError(res, error, "Erro ao atualizar usuário.");
  }
};

export const deleteUser = async (req, res) => {
  if (String(req.admin.id) === String(req.params.id)) {
    return res.status(409).json({ erro: "Você não pode excluir a própria conta." });
  }
  try {
    const [[user]] = await conexao.query(
      "SELECT papel_usuario, status_usuario FROM tbl_usuario WHERE id_usuario = ?",
      [req.params.id],
    );
    if (!user) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (user.papel_usuario === 'superadmin' && user.status_usuario === 'ativo') {
      const [[superAdmins]] = await conexao.query(
        "SELECT COUNT(*) AS count FROM tbl_usuario WHERE papel_usuario = 'superadmin' AND status_usuario = 'ativo'",
      );
      if (Number(superAdmins.count) <= 1) {
        return res.status(409).json({ erro: "O último superadministrador ativo não pode ser excluído." });
      }
    }
    const [result] = await conexao.query(
      "DELETE FROM tbl_usuario WHERE id_usuario = ?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Usuário não encontrado." });
    res.json({ mensagem: "Usuário excluído com sucesso." });
  } catch (error) {
    databaseError(res, error, "Erro ao excluir usuário.");
  }
};

export const getGroupSubmissions = async (_req, res) => {
  try {
    const [submissions] = await conexao.query(`
      SELECT s.id_solicitacao AS id, s.nome_grupo AS name, s.descricao_grupo AS description,
        s.link_telegram AS telegramLink, s.url_imagem AS imageUrl, s.nome_contato AS contactName,
        s.email_contato AS contactEmail, s.status_solicitacao AS status,
        COALESCE(c.nome_categoria, 'Categoria removida') AS category,
        DATE_FORMAT(s.data_criacao_solicitacao, '%d/%m/%Y %H:%i') AS createdAt
      FROM tbl_solicitacao_grupo s
      LEFT JOIN tbl_categoria c ON c.id_categoria = s.id_categoria
      ORDER BY FIELD(s.status_solicitacao, 'pendente', 'aprovada', 'recusada'), s.id_solicitacao DESC
    `);
    res.json(submissions);
  } catch (error) {
    databaseError(res, error, "Erro ao buscar solicitacoes.");
  }
};

export const approveGroupSubmission = async (req, res) => {
  const connection = await conexao.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT * FROM tbl_solicitacao_grupo
       WHERE id_solicitacao = ? FOR UPDATE`,
      [req.params.id],
    );
    const submission = rows[0];
    if (!submission) {
      await connection.rollback();
      return res.status(404).json({ erro: "Solicitacao nao encontrada." });
    }
    if (submission.status_solicitacao !== "pendente") {
      await connection.rollback();
      return res
        .status(409)
        .json({ erro: "Esta solicitacao ja foi analisada." });
    }

    if (!submission.id_categoria) {
      await connection.rollback();
      return res.status(409).json({ erro: "A categoria desta solicitação foi removida." });
    }
    const [categories] = await connection.query(
      "SELECT id_categoria FROM tbl_categoria WHERE id_categoria = ? FOR UPDATE",
      [submission.id_categoria],
    );
    if (!categories.length) {
      await connection.rollback();
      return res.status(409).json({ erro: "A categoria desta solicitação foi removida." });
    }

    const [duplicateLinks] = await connection.query(
      "SELECT id_grupo FROM tbl_grupo_telegram WHERE link_telegram = ? LIMIT 1",
      [submission.link_telegram],
    );
    if (duplicateLinks.length) {
      await connection.rollback();
      return res
        .status(409)
        .json({ erro: "Já existe um grupo com este link do Telegram." });
    }

    let slug = groupSlug(submission.nome_grupo);
    let suffix = 2;
    while (true) {
      const [existing] = await connection.query(
        "SELECT id_grupo FROM tbl_grupo_telegram WHERE url_grupo = ?",
        [slug],
      );
      if (!existing.length) break;
      slug = `${groupSlug(submission.nome_grupo).slice(0, 160)}-${suffix}`;
      suffix += 1;
    }

    const [group] = await connection.query(
      `INSERT INTO tbl_grupo_telegram
       (nome_grupo, id_categoria, url_grupo, descricao_grupo, link_telegram, status_grupo, destaque_grupo)
       VALUES (?, ?, ?, ?, ?, 'ativo', 0)`,
      [
        submission.nome_grupo,
        submission.id_categoria,
        slug,
        submission.descricao_grupo,
        submission.link_telegram,
      ],
    );
    await connection.query(
      "UPDATE tbl_solicitacao_grupo SET status_solicitacao = 'aprovada' WHERE id_solicitacao = ?",
      [submission.id_solicitacao],
    );
    await connection.commit();
    res.json({
      id: group.insertId,
      mensagem: "Solicitacao aprovada e grupo publicado.",
    });
  } catch (error) {
    await connection.rollback();
    databaseError(res, error, "Erro ao aprovar solicitacao.");
  } finally {
    connection.release();
  }
};

export const rejectGroupSubmission = async (req, res) => {
  try {
    const [result] = await conexao.query(
      "UPDATE tbl_solicitacao_grupo SET status_solicitacao = 'recusada' WHERE id_solicitacao = ? AND status_solicitacao = 'pendente'",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res
        .status(404)
        .json({ erro: "Solicitacao pendente nao encontrada." });
    res.json({ mensagem: "Solicitacao recusada." });
  } catch (error) {
    databaseError(res, error, "Erro ao recusar solicitacao.");
  }
};
