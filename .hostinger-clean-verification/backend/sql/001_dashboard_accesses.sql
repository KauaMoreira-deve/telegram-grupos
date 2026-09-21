CREATE TABLE IF NOT EXISTS tbl_acesso_grupo (
  id_acesso BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_grupo BIGINT UNSIGNED NOT NULL,
  data_acesso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_acesso),
  KEY idx_acesso_grupo (id_grupo),
  CONSTRAINT fk_acesso_grupo FOREIGN KEY (id_grupo)
    REFERENCES tbl_grupo_telegram (id_grupo) ON DELETE CASCADE
);

ALTER TABLE tbl_grupo_telegram
  ADD COLUMN data_criacao_grupo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
