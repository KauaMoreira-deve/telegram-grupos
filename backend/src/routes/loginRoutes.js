import express from 'express'
import conexao from '../config/database.js'
import bcrypt from 'bcrypt'

const router = express.Router()


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('E-mail recebido:', email)

    const [resultado] = await conexao.query(
      'SELECT * FROM tbl_usuario WHERE email_usuario = ?',
      [email]
    )

    console.log('Usuários encontrados:', resultado.length)

    if (resultado.length === 0) {
      return res.status(401).json({
        erro: 'E-mail ou senha incorretos'
      })
    }

    const usuario = resultado[0]

    console.log('Usuário encontrado:', usuario.email_usuario)
    console.log('Tamanho do hash:', usuario.senha_usuario.length)
    console.log('Começa com bcrypt:',
      usuario.senha_usuario.startsWith('$2')
    )

    const senhaCorreta = await bcrypt.compare(
      password,
      usuario.senha_usuario
    )

    console.log('RESULTADO DO BCRYPT:', senhaCorreta)

    console.log('Senha correta:', senhaCorreta)

    if (!senhaCorreta) {
      return res.status(401).json({
        erro: 'E-mail ou senha incorretos'
      })
    }

    res.json({
      mensagem: 'Login realizado com sucesso!'
    })

  } catch (erro) {
    console.error('Erro no login:', erro)

    res.status(500).json({
      erro: 'Erro ao realizar login'
    })
  }
})

export default router