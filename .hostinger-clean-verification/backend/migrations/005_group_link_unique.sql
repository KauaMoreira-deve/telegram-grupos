ALTER TABLE tbl_grupo_telegram
  DROP INDEX uq_grupo_url,
  ADD UNIQUE KEY uq_grupo_link_telegram (link_telegram);
