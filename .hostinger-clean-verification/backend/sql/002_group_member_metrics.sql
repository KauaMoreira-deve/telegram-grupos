-- Execute este arquivo uma vez, depois de 001_dashboard_accesses.sql.
-- A contagem é preenchida quando o Telegram disponibiliza o número publicamente.
ALTER TABLE tbl_grupo_telegram
  ADD COLUMN quantidade_membros INT UNSIGNED NULL AFTER destaque_grupo,
  ADD COLUMN data_atualizacao_membros DATETIME NULL AFTER quantidade_membros;
