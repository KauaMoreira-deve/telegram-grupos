# Backend

Use `.env.example` como referência, copie-o para `.env` no desenvolvimento e preencha os valores locais. Em produção, as mesmas variáveis podem ser fornecidas pela plataforma de hospedagem. O banco indicado em `DB_NAME` precisa existir antes da primeira execução.

Variáveis disponíveis:

- `NODE_ENV`: ambiente da aplicação, como `development` ou `production`.
- `HOST` e `PORT`: interface e porta do servidor HTTP.
- `CORS_ORIGIN`: origens permitidas, separadas por vírgula quando houver mais de uma.
- `TRUST_PROXY`: quantidade exata de proxies reversos confiáveis. No Docker com Caddy e Nginx, use `2`; nunca use `true`.
- `RUN_MIGRATIONS`: executa migrations no boot. Em produção com mais de uma réplica, prefira `false` e execute `npm run db:migrate` uma vez na etapa de release.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: conexão MySQL.
- `DB_CONNECTION_LIMIT`: tamanho máximo do pool de conexões.
- `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED` e `DB_SSL_CA`: TLS opcional para MySQL. Mantenha a verificação do certificado ativada em banco gerenciado.
- `AUTH_SECRET`: chave privada usada para assinar sessões; use um valor longo e aleatório em produção.
- `AUTH_TOKEN_TTL_MS`: duração da sessão em milissegundos.
- `TELEGRAM_BOT_TOKEN`: opcional; usa a API oficial do Telegram para obter a quantidade de membros de grupos públicos com mais confiabilidade.

O projeto requer Node.js 22.19 ou superior e carrega `backend/.env` automaticamente.

```bash
npm install
npm run dev
```

O comando de inicialização usa os certificados do sistema operacional para permitir a consulta HTTPS ao Telegram durante a sincronização de membros.
No desenvolvimento, o backend também reinicia automaticamente quando os arquivos são alterados.

Para forçar uma atualização imediata da quantidade de membros de todos os grupos ativos, execute `npm run members:sync`.

Para criar ou atualizar as tabelas versionadas, execute:

```bash
npm run db:migrate
```

O servidor também executa migrations pendentes antes de começar a atender requisições. As tabelas de usuários, categorias, grupos, acessos e solicitações públicas estão em `migrations/`.

## Produção e segurança

- Configure `CORS_ORIGIN=https://putarianotelegram.net,https://www.putarianotelegram.net`.
- Gere `AUTH_SECRET` com pelo menos 32 bytes aleatórios e mantenha-o apenas no gerenciador de segredos da hospedagem.
- Use um usuário MySQL exclusivo, senha forte, privilégios mínimos e TLS quando a conexão sair da rede privada.
- O primeiro usuário ativo existente na migration de perfis torna-se `superadmin`; os demais ficam como `editor`. Em instalação vazia, crie o primeiro usuário explicitamente com `papel_usuario='superadmin'`.
- O endpoint de monitoramento é `GET /api/health` e não expõe dados de infraestrutura.
- Limites em memória protegem uma instância. Em múltiplas réplicas, mantenha também rate limiting no proxy ou use um armazenamento compartilhado.

Nunca envie arquivos `.env` ao Git. Se uma credencial tiver sido versionada anteriormente, remova-a do histórico e rotacione-a no provedor; apenas editar o arquivo atual não revoga o segredo antigo.
