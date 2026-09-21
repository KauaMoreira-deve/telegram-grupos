ALTER TABLE tbl_solicitacao_grupo
  DROP FOREIGN KEY fk_solicitacao_categoria,
  MODIFY COLUMN id_categoria BIGINT UNSIGNED NULL;
