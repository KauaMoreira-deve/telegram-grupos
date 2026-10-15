-- Headline e subheadline exibidas no topo de cada página de categoria.
ALTER TABLE tbl_categoria
  ADD COLUMN headline_categoria VARCHAR(160) NULL,
  ADD COLUMN subheadline_categoria VARCHAR(500) NULL;

-- Configurações gerais do site editáveis pelo painel (ex.: links do pop under).
CREATE TABLE IF NOT EXISTS tbl_configuracao (
  chave_configuracao VARCHAR(80) NOT NULL,
  valor_configuracao TEXT NOT NULL,
  data_atualizacao_configuracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (chave_configuracao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
