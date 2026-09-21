ALTER TABLE tbl_usuario
  ADD COLUMN papel_usuario ENUM('superadmin', 'editor') NOT NULL DEFAULT 'editor' AFTER senha_usuario;

UPDATE tbl_usuario
SET papel_usuario = 'superadmin'
WHERE id_usuario = (
  SELECT id_usuario
  FROM (
    SELECT id_usuario
    FROM tbl_usuario
    WHERE status_usuario = 'ativo'
    ORDER BY id_usuario
    LIMIT 1
  ) AS primeiro_admin
);
