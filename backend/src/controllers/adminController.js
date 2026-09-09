import conexao from '../config/database.js';

export const getDashboardStats = async (req, res) => {
    try {
        const [totalGroups] = await conexao.query('SELECT COUNT(*) as count FROM tbl_grupo_telegram');
        const [activeGroups] = await conexao.query('SELECT COUNT(*) as count FROM tbl_grupo_telegram WHERE status_grupo = "ativo"');
        const [totalCategories] = await conexao.query('SELECT COUNT(*) as count FROM tbl_categoria');
        
        // Mocked acessos for now as there's no log table
        const totalAcessos = 12400;

        const [recentGroups] = await conexao.query(`
            SELECT g.id_grupo as id, g.nome_grupo as name, c.nome_categoria as category, g.status_grupo as status, "09/09/2026" as date
            FROM tbl_grupo_telegram g
            LEFT JOIN tbl_categoria c ON g.id_categoria = c.id_categoria
            ORDER BY g.id_grupo DESC LIMIT 4
        `);

        res.json({
            stats: {
                totalGroups: totalGroups[0].count,
                activeGroups: activeGroups[0].count,
                totalCategories: totalCategories[0].count,
                totalAcessos
            },
            recentGroups
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas.' });
    }
};

export const getGroups = async (req, res) => {
    try {
        const [groups] = await conexao.query(`
            SELECT g.id_grupo as id, g.nome_grupo as name, c.nome_categoria as category, 
                   g.status_grupo as status, g.destaque_grupo as featured, "09/09/2026" as date
            FROM tbl_grupo_telegram g
            LEFT JOIN tbl_categoria c ON g.id_categoria = c.id_categoria
            ORDER BY g.id_grupo DESC
        `);
        // Map featured from tinyint (1/0) to boolean
        const formattedGroups = groups.map(g => ({
            ...g,
            featured: g.featured === 1,
            status: g.status === 'ativo' ? 'Ativo' : 'Inativo'
        }));
        res.json(formattedGroups);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar grupos.' });
    }
};

export const getCategories = async (req, res) => {
    try {
        const [categories] = await conexao.query(`
            SELECT id_categoria as id, nome_categoria as name, url_categoria as url, status_categoria as status 
            FROM tbl_categoria
            ORDER BY id_categoria DESC
        `);
        const formattedCategories = categories.map(c => ({
            ...c,
            status: c.status === 'ativo' ? 'Ativo' : 'Inativo'
        }));
        res.json(formattedCategories);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar categorias.' });
    }
};

export const getUsers = async (req, res) => {
    try {
        const [users] = await conexao.query(`
            SELECT id_usuario as id, nome_usuario as name, email_usuario as email, status_usuario as status
            FROM tbl_usuario
            ORDER BY id_usuario DESC
        `);
        const formattedUsers = users.map(u => ({
            ...u,
            status: u.status === 'ativo' ? 'Ativo' : 'Inativo'
        }));
        res.json(formattedUsers);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar usuários.' });
    }
};
