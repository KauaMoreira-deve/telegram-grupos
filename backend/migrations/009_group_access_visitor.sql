-- Identificador anônimo do visitante em cada acesso, para contar pessoas únicas além de cliques.
ALTER TABLE tbl_acesso_grupo
  ADD COLUMN identificador_visitante VARCHAR(64) NULL,
  ADD KEY idx_acesso_visitante (identificador_visitante);
