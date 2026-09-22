import bcrypt from 'bcrypt';
import express from 'express';
import conexao from '../config/database.js';
import { createAccessToken } from '../middlewares/authMiddleware.js';
import { createRateLimiter, noStore } from '../middlewares/securityMiddleware.js';

const router = express.Router();
const DUMMY_PASSWORD_HASH = '$2b$12$AZRTomeIHTLX49iJ5/LlVOvFRBXH.mKrUkWQayDC/5EZ/1wtnpqRu';
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

router.post('/login', noStore, loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const validInput = email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && password.length > 0
    && password.length <= 128
    && Buffer.byteLength(password, 'utf8') <= 72;

  if (!validInput) {
    return res.status(400).json({ erro: 'Informe e-mail e senha válidos.' });
  }

  try {
    const [users] = await conexao.query(
      `SELECT id_usuario, nome_usuario, email_usuario, senha_usuario, status_usuario, papel_usuario
       FROM tbl_usuario
       WHERE email_usuario = ? AND status_usuario = 'ativo'
       LIMIT 1`,
      [email],
    );
    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user?.senha_usuario || DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    return res.json({
      mensagem: 'Login realizado com sucesso!',
      token: createAccessToken(user.id_usuario),
      usuario: {
        id: user.id_usuario,
        nome: user.nome_usuario,
        email: user.email_usuario,
        status: user.status_usuario,
        role: user.papel_usuario,
      },
    });
  } catch (error) {
    console.error('Erro ao processar login.', { code: error.code, name: error.name });
    return res.status(500).json({ erro: 'Erro ao realizar login.' });

  }
});

export default router;
