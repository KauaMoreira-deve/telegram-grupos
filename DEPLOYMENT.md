# Hospedagem de produção — Putaria no Telegram

O projeto está preparado para publicar o frontend e a API no mesmo domínio:

- Site: `https://putarianotelegram.net`
- API: `https://putarianotelegram.net/api`
- `www.putarianotelegram.net` redireciona para o domínio principal.

A configuração em `compose.production.yml` usa Caddy para HTTPS automático, Nginx para servir a aplicação React e Node.js para a API.

## Estrutura e caminhos do repositório

O frontend e o backend continuam separados, mas existe um `package.json` na raiz para coordenar um deploy full-stack. Em plataformas gerenciadas como a Hostinger, use a raiz do repositório e os scripts de build e inicialização documentados abaixo.

| Serviço | Diretório de contexto | Arquivo principal |
|---|---|---|
| Aplicação completa | raiz do repositório | `compose.production.yml` |
| Frontend | `frontend` | `frontend/Dockerfile` |
| Backend | `backend` | `backend/Dockerfile` |
| Proxy HTTPS | raiz do repositório | `Caddyfile` |

Ao usar uma plataforma com suporte a Docker Compose, selecione a raiz do repositório e informe `compose.production.yml`. Se a plataforma exigir serviços separados, use `frontend` e `backend` como diretórios raiz de cada serviço, respectivamente.

### Hostinger Node.js Web App

- Root Directory: raiz do repositório (`.`)
- Build command: `npm run build:hostinger`
- Start command: `npm start`
- Entry file, quando solicitado: `backend/index.js`
- Node.js: `22.x`

O build gera `frontend/dist`. Em produção, o Express serve esse diretório para rotas do site e mantém todas as rotas `/api/*` sob responsabilidade da API.

## 1. Requisitos do servidor

- Um VPS Linux com Docker Engine e Docker Compose v2.
- Portas TCP `80` e `443` liberadas; UDP `443` é recomendada para HTTP/3.
- Um banco MySQL externo ou gerenciado, acessível pelo servidor.
- Backups automáticos e criptografados do banco.

## 2. Configurar o domínio

No provedor DNS, configure:

| Tipo | Nome | Destino |
|---|---|---|
| `A` | `@` | IPv4 público do servidor |
| `AAAA` | `@` | IPv6 público do servidor, se houver |
| `CNAME` | `www` | `putarianotelegram.net` |

Remova registros conflitantes. Aguarde a propagação antes de iniciar o gateway. O Caddy emitirá e renovará o certificado TLS automaticamente.

## 3. Configurar segredos

No servidor, na raiz do projeto:

```bash
cp .env.example .env
openssl rand -base64 48
```

Preencha o `.env` com os dados reais do banco e use o resultado aleatório em `AUTH_SECRET`. O usuário MySQL deve possuir acesso somente ao banco da aplicação e apenas às operações necessárias. Não use `root`.

Em produção, mantenha `DB_SSL=true` e `DB_SSL_REJECT_UNAUTHORIZED=true`. Se o provedor exigir uma autoridade certificadora própria, informe o PEM em `DB_SSL_CA`, substituindo as quebras de linha por `\n`. Desativar a validação do certificado deixa a conexão vulnerável a interceptação.

O `.env` é ignorado pelo Git e nunca deve ser copiado para uma imagem Docker, enviado por mensagem ou colocado no frontend. Variáveis iniciadas com `VITE_` são públicas depois do build e não podem conter segredos.

## 4. Publicar

```bash
docker compose -f compose.production.yml build --pull
docker compose -f compose.production.yml up -d
docker compose -f compose.production.yml ps
```

Verifique:

```bash
curl --fail https://putarianotelegram.net/healthz
curl --fail https://putarianotelegram.net/api/health
```

Para acompanhar os logs sem revelar variáveis de ambiente:

```bash
docker compose -f compose.production.yml logs --tail=200 -f
```

## 5. Atualizar o site

```bash
git pull --ff-only
docker compose -f compose.production.yml build --pull
docker compose -f compose.production.yml up -d --remove-orphans
```

Antes de cada atualização, confirme que existe um backup recente do banco. As migrations são executadas pela API durante a inicialização.

## 6. Checklist obrigatório antes do lançamento

- Trocar qualquer senha que já tenha aparecido em código ou no histórico do Git.
- Usar senhas exclusivas para banco, hospedagem, DNS e Telegram.
- Ativar autenticação em dois fatores no provedor, registrador e conta do Telegram.
- Restringir SSH a chaves, desativar login de `root` e manter o sistema atualizado.
- Liberar no firewall somente SSH, HTTP e HTTPS.
- Testar restauração dos backups, não apenas a criação deles.
- Monitorar disponibilidade, uso de disco, erros `5xx` e tentativas de login bloqueadas.
- Definir uma política de retenção para logs e restringir o acesso a eles; o gateway mantém no máximo cinco arquivos rotacionados por até 30 dias.
- Confirmar que `/admin` e `/dash` não são indexados por buscadores.
- Validar os cabeçalhos HTTP com uma ferramenta como Mozilla Observatory após a publicação.

## 7. Observações de segurança

HTTPS, CORS, headers, rate limits e validações reduzem riscos, mas segurança exige manutenção contínua. Atualize dependências regularmente, revise logs, aplique correções do sistema e faça auditorias periódicas. Se uma credencial já foi versionada, removê-la do arquivo atual não basta: ela deve ser rotacionada e, se o repositório tiver sido compartilhado, o histórico precisa ser saneado com planejamento.
