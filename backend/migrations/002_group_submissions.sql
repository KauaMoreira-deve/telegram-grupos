CREATE TABLE IF NOT EXISTS tbl_solicitacao_grupo (
  id_solicitacao BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_categoria BIGINT UNSIGNED NOT NULL,
  nome_grupo VARCHAR(150) NOT NULL,
  descricao_grupo TEXT NOT NULL,
  link_telegram VARCHAR(255) NOT NULL,
  url_imagem VARCHAR(2048) NULL,
  nome_contato VARCHAR(150) NOT NULL,
  email_contato VARCHAR(254) NOT NULL,
  status_solicitacao ENUM('pendente', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
  data_criacao_solicitacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao_solicitacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_solicitacao),
  KEY idx_solicitacao_status_data (status_solicitacao, data_criacao_solicitacao),
  KEY idx_solicitacao_categoria (id_categoria),
  CONSTRAINT fk_solicitacao_categoria FOREIGN KEY (id_categoria)
    REFERENCES tbl_categoria (id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
