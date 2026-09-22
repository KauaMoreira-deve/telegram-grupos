import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import conexao from "./database.js";

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

/**
 * Divide o conteúdo de um arquivo .sql em statements individuais,
 * removendo comentários de linha (--).
 */
function sqlStatements(source) {
  return source
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/**
 * Verifica se um índice existe em uma tabela.
 */
async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?`,
    [tableName, indexName],
  );
  return rows[0].cnt > 0;
}

/**
 * Verifica se uma coluna existe em uma tabela.
 */
async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName],
  );
  return rows[0].cnt > 0;
}

/**
 * Verifica se uma foreign key existe em uma tabela.
 */
async function foreignKeyExists(connection, tableName, constraintName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.table_constraints
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND constraint_name = ?
       AND constraint_type = 'FOREIGN KEY'`,
    [tableName, constraintName],
  );
  return rows[0].cnt > 0;
}

/**
 * Extrai o nome da tabela de um statement ALTER TABLE.
 * Retorna null se não for ALTER TABLE.
 */
function parseAlterTable(statement) {
  const match = statement.match(/^ALTER\s+TABLE\s+(\S+)/i);
  return match ? match[1].replace(/`/g, "") : null;
}

/**
 * Executa um statement SQL de migration com tratamento de idempotência.
 *
 * Para ALTER TABLE, cada sub-operação (separada por vírgula) é verificada
 * individualmente contra o estado real do banco via information_schema,
 * evitando falhas em re-execuções parciais.
 */
async function executeMigrationStatement(connection, statement, migrationFile) {
  const tableName = parseAlterTable(statement);

  // Statements que não são ALTER TABLE são executados diretamente.
  // CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, INSERT, UPDATE, etc.
  if (!tableName) {
    await connection.query(statement);
    return;
  }

  // Divide as sub-operações do ALTER TABLE.
  // Remove o prefixo "ALTER TABLE <nome>" e separa por vírgula nos pontos
  // onde há palavras-chave de operação (ADD, DROP, MODIFY, CHANGE).
  const body = statement.replace(/^ALTER\s+TABLE\s+\S+\s+/i, "");
  const parts = body
    .split(/,\s*(?=(?:ADD|DROP|MODIFY|CHANGE)\s+)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const partsToExecute = [];

  for (const part of parts) {
    const shouldExecute = await shouldExecutePart(
      connection,
      tableName,
      part,
      migrationFile,
    );
    if (shouldExecute) {
      partsToExecute.push(part);
    }
  }

  if (partsToExecute.length > 0) {
    await connection.query(
      `ALTER TABLE ${tableName} ${partsToExecute.join(", ")}`,
    );
  }
}

/**
 * Determina se uma sub-operação de ALTER TABLE deve ser executada,
 * consultando o estado real do banco para garantir idempotência.
 */
async function shouldExecutePart(connection, tableName, part, migrationFile) {
  // DROP INDEX <name> ou DROP KEY <name>
  const dropIndex = part.match(/^DROP\s+(?:INDEX|KEY)\s+(\S+)/i);
  if (dropIndex) {
    const name = dropIndex[1].replace(/`/g, "");
    if (!(await indexExists(connection, tableName, name))) {
      console.log(
        `  [${migrationFile}] Índice ${name} não existe em ${tableName}. DROP ignorado com segurança.`,
      );
      return false;
    }
    return true;
  }

  // DROP FOREIGN KEY <name>
  const dropFk = part.match(/^DROP\s+FOREIGN\s+KEY\s+(\S+)/i);
  if (dropFk) {
    const name = dropFk[1].replace(/`/g, "");
    if (!(await foreignKeyExists(connection, tableName, name))) {
      console.log(
        `  [${migrationFile}] Foreign key ${name} não existe em ${tableName}. DROP ignorado com segurança.`,
      );
      return false;
    }
    return true;
  }

  // DROP COLUMN <name>
  const dropCol = part.match(/^DROP\s+COLUMN\s+(\S+)/i);
  if (dropCol) {
    const name = dropCol[1].replace(/`/g, "");
    if (!(await columnExists(connection, tableName, name))) {
      console.log(
        `  [${migrationFile}] Coluna ${name} não existe em ${tableName}. DROP ignorado com segurança.`,
      );
      return false;
    }
    return true;
  }

  // ADD INDEX/KEY <name> ou ADD UNIQUE KEY/INDEX <name>
  const addIndex = part.match(
    /^ADD\s+(?:UNIQUE\s+)?(?:INDEX|KEY)\s+(\S+)/i,
  );
  if (addIndex) {
    const name = addIndex[1].replace(/`/g, "");
    if (await indexExists(connection, tableName, name)) {
      console.log(
        `  [${migrationFile}] Índice ${name} já existe em ${tableName}. ADD ignorado com segurança.`,
      );
      return false;
    }
    return true;
  }

  // ADD COLUMN <name>
  const addCol = part.match(/^ADD\s+COLUMN\s+(\S+)/i);
  if (addCol) {
    const name = addCol[1].replace(/`/g, "");
    if (await columnExists(connection, tableName, name)) {
      console.log(
        `  [${migrationFile}] Coluna ${name} já existe em ${tableName}. ADD ignorado com segurança.`,
      );
      return false;
    }
    return true;
  }

  // ADD CONSTRAINT / ADD FOREIGN KEY — verifica se a FK já existe
  const addFk = part.match(/^ADD\s+(?:CONSTRAINT\s+(\S+)\s+)?FOREIGN\s+KEY/i);
  if (addFk && addFk[1]) {
    const name = addFk[1].replace(/`/g, "");
    if (await foreignKeyExists(connection, tableName, name)) {
      console.log(
        `  [${migrationFile}] Foreign key ${name} já existe em ${tableName}. ADD ignorado com segurança.`,
      );
      return false;
    }
    return true;
  }

  // MODIFY COLUMN, CHANGE COLUMN, e demais: sempre executa.
  return true;
}

/**
 * Executa todas as migrations SQL pendentes em ordem.
 *
 * Usa a tabela `schema_migrations` para rastrear quais migrations já foram
 * aplicadas. Cada migration é executada dentro de uma transação (quando o
 * storage engine suporta), e só é registrada como concluída após sucesso.
 */
export async function runMigrations() {
  await conexao.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [appliedRows] = await conexao.query(
    "SELECT migration FROM schema_migrations",
  );
  const applied = new Set(appliedRows.map((row) => row.migration));
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_.+\.sql$/i.test(file))
    .sort();
  const executed = [];

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Migration já aplicada: ${file}`);
      continue;
    }

    console.log(`Executando migration: ${file}`);
    const source = await readFile(path.join(migrationsDirectory, file), "utf8");
    const connection = await conexao.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of sqlStatements(source)) {
        await executeMigrationStatement(connection, statement, file);
      }
      await connection.query(
        "INSERT INTO schema_migrations (migration) VALUES (?)",
        [file],
      );
      await connection.commit();
      console.log(`Migration concluída: ${file}`);
      executed.push(file);
    } catch (error) {
      await connection.rollback();
      throw new Error(`Falha na migration ${file}: ${error.message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  return executed;
}
