import mysql from 'mysql2/promise';

async function extractSchema() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sqlroot',
            database: 'db_telegramjon'
        });

        const [tables] = await conn.query('SHOW TABLES');
        
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            console.log(`\n--- Table: ${tableName} ---`);
            const [columns] = await conn.query(`DESCRIBE ${tableName}`);
            console.log(columns.map(c => `${c.Field} (${c.Type})`).join('\n'));
        }

        await conn.end();
    } catch (e) {
        console.error("Database error:", e.message);
    }
}

extractSchema();
