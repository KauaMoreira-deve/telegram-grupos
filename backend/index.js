import express from 'express'
import conexao from './src/config/database.js'
import cors from 'cors'
import bcrypt from 'bcrypt'

import loginRoutes from './src/routes/loginRoutes.js'
import adminRoutes from './src/routes/adminRoutes.js'


const app = express()

app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
  res.send('Hello World')
})

app.use('/api', loginRoutes)
app.use('/api/admin', adminRoutes)

app.get('/teste-banco', async (req, res) => {
    try {
        const [resultado] = await conexao.query('SELECT * FROM tbl_grupo_telegram');
        res.json(resultado);
    }catch (erro) {
    console.error(erro)
    res.status(500).json({
      erro: 'Erro ao consultar o banco de dados'
    })
}
                                                                 
})


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
});