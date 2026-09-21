import conexao from './database.js';

const METRIC_COLUMNS = new Map([
  ['quantidade_membros', 'INT UNSIGNED NULL AFTER destaque_grupo'],
  ['data_atualizacao_membros', 'DATETIME NULL AFTER quantidade_membros'],
]);

export async function ensureGroupMetricsSchema() {
  const [columns] = await conexao.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_grupo_telegram'
       AND COLUMN_NAME IN ('quantidade_membros', 'data_atualizacao_membros')`,
  );
  const existingColumns = new Set(columns.map(({ COLUMN_NAME: name }) => name));

  for (const [name, definition] of METRIC_COLUMNS) {
    if (!existingColumns.has(name)) {
      await conexao.query(`ALTER TABLE tbl_grupo_telegram ADD COLUMN ${name} ${definition}`);
    }
  }
}
