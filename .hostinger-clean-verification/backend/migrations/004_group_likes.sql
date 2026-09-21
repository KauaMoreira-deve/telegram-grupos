CREATE TABLE IF NOT EXISTS tbl_curtida_grupo (
  id_curtida BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_grupo BIGINT UNSIGNED NOT NULL,
  identificador_visitante VARCHAR(64) NOT NULL,
  data_curtida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_curtida),
  UNIQUE KEY uq_curtida_grupo_visitante (id_grupo, identificador_visitante),
  KEY idx_curtida_grupo (id_grupo),
  CONSTRAINT fk_curtida_grupo FOREIGN KEY (id_grupo)
    REFERENCES tbl_grupo_telegram (id_grupo) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
