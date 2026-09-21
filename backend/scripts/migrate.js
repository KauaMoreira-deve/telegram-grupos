import conexao from '../src/config/database.js';
import { runMigrations } from '../src/config/migrations.js';

try {
  const executed = await runMigrations();
  console.log(executed.length ? `Migrations concluídas: ${executed.join(', ')}` : 'Banco de dados já está atualizado.');
} catch (error) {
  console.error('Não foi possível executar a migração.', { code: error.code, name: error.name });
  process.exitCode = 1;
} finally {
  await conexao.end();
}
