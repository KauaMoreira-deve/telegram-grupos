CREATE TABLE IF NOT EXISTS tbl_hashtag (
  id_hashtag BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_hashtag VARCHAR(60) NOT NULL,
  data_criacao_hashtag DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_hashtag),
  UNIQUE KEY uq_hashtag_nome (nome_hashtag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_grupo_hashtag (
  id_grupo BIGINT UNSIGNED NOT NULL,
  id_hashtag BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_grupo, id_hashtag),
  KEY idx_grupo_hashtag_hashtag (id_hashtag),
  CONSTRAINT fk_grupo_hashtag_grupo FOREIGN KEY (id_grupo)
    REFERENCES tbl_grupo_telegram (id_grupo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_grupo_hashtag_hashtag FOREIGN KEY (id_hashtag)
    REFERENCES tbl_hashtag (id_hashtag) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
