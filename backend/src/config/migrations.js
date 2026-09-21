import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import conexao from "./database.js";

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

function sqlStatements(source) {
  return source
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function executeMigrationStatement(connection, statement) {
  if (!/^ALTER TABLE tbl_grupo_telegram\s+/i.test(statement)) {
    await connection.query(statement);
    return;
  }

  const [indexes] = await connection.query(
    "SHOW INDEX FROM tbl_grupo_telegram",
  );
  const existingIndexes = new Set(indexes.map((index) => index.Key_name));
  const statements = statement
    .replace(/^ALTER TABLE tbl_grupo_telegram\s+/i, "")
    .split(/,\s*(?=(?:DROP|ADD)\s+(?:INDEX|(?:UNIQUE\s+)?KEY))/i)
    .map((part) => part.trim())
    .filter((part) => {
      const match = part.match(/(?:DROP|ADD)\s+(?:UNIQUE\s+)?KEY\s+([\w]+)/i);
      if (!match) return true;
      const indexName = match[1];
      if (/^DROP\s+/i.test(part)) return existingIndexes.has(indexName);
      return !existingIndexes.has(indexName);
    });

  if (statements.length)
    await connection.query(
      `ALTER TABLE tbl_grupo_telegram ${statements.join(", ")}`,
    );
}

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
    if (applied.has(file)) continue;

    const source = await readFile(path.join(migrationsDirectory, file), "utf8");
    const connection = await conexao.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of sqlStatements(source))
        await executeMigrationStatement(connection, statement);
      await connection.query(
        "INSERT INTO schema_migrations (migration) VALUES (?)",
        [file],
      );
      await connection.commit();
      executed.push(file);
    } catch (error) {
      await connection.rollback();
      throw new Error(`Falha na migration ${file}: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  return executed;
}
