CREATE TABLE IF NOT EXISTS tbl_usuario (
  id_usuario BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_usuario VARCHAR(150) NOT NULL,
  email_usuario VARCHAR(254) NOT NULL,
  senha_usuario VARCHAR(255) NOT NULL,
  status_usuario ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  data_criacao_usuario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao_usuario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_email (email_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_categoria (
  id_categoria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_categoria VARCHAR(100) NOT NULL,
  url_categoria VARCHAR(120) NOT NULL,
  status_categoria ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  data_criacao_categoria DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao_categoria DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categoria_url (url_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_grupo_telegram (
  id_grupo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_categoria BIGINT UNSIGNED NOT NULL,
  nome_grupo VARCHAR(150) NOT NULL,
  url_grupo VARCHAR(180) NOT NULL,
  descricao_grupo TEXT NOT NULL,
  link_telegram VARCHAR(255) NOT NULL,
  url_imagem VARCHAR(2048) NULL,
  status_grupo ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  destaque_grupo TINYINT(1) NOT NULL DEFAULT 0,
  quantidade_membros INT UNSIGNED NULL,
  data_atualizacao_membros DATETIME NULL,
  data_criacao_grupo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_grupo),
  UNIQUE KEY uq_grupo_url (url_grupo),
  KEY idx_grupo_categoria_status (id_categoria, status_grupo),
  CONSTRAINT fk_grupo_categoria FOREIGN KEY (id_categoria)
    REFERENCES tbl_categoria (id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_acesso_grupo (
  id_acesso BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_grupo BIGINT UNSIGNED NOT NULL,
  data_acesso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_acesso),
  KEY idx_acesso_grupo (id_grupo),
  KEY idx_acesso_data (data_acesso),
  CONSTRAINT fk_acesso_grupo FOREIGN KEY (id_grupo)
    REFERENCES tbl_grupo_telegram (id_grupo) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
