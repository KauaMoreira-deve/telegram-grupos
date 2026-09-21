import conexao from '../src/config/database.js';
import { fetchTelegramMemberCount } from '../src/services/telegramService.js';

try {
  const [groups] = await conexao.query(
    "SELECT id_grupo, link_telegram FROM tbl_grupo_telegram WHERE status_grupo = 'ativo'",
  );

  for (const group of groups) {
    try {
      const members = await fetchTelegramMemberCount(group.link_telegram);
      if (members === null) {
        console.log(`Grupo ${group.id_grupo}: quantidade não divulgada pelo Telegram.`);
        continue;
      }

      await conexao.query(
        'UPDATE tbl_grupo_telegram SET quantidade_membros = ?, data_atualizacao_membros = NOW() WHERE id_grupo = ?',
        [members, group.id_grupo],
      );
      console.log(`Grupo ${group.id_grupo}: ${members} membros.`);
    } catch (error) {
      console.error('Não foi possível sincronizar um grupo.', {
        groupId: group.id_grupo,
        code: error.code,
        name: error.name,
      });
    }
  }
} finally {
  await conexao.end();
}
