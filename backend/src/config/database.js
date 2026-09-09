import mysql from 'mysql2/promise';

const conexao = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'sqlroot',
    database: 'db_telegramjon',
})

export default conexao;