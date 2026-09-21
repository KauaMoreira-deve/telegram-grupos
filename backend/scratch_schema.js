import conexao from './src/config/database.js';

async function extractSchema() {
  try {
    const [tables] = await conexao.query('SHOW TABLES');

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      console.log(`\n--- Tabela: ${tableName} ---`);
      const [columns] = await conexao.query('DESCRIBE ??', [tableName]);
      console.log(columns.map((column) => `${column.Field} (${column.Type})`).join('\n'));
    }
  } catch (error) {
    console.error('Erro ao consultar o esquema do banco:', error.message);
    process.exitCode = 1;
  } finally {
    await conexao.end();
  }
}

void extractSchema();
