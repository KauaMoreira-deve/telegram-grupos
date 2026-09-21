# Putaria no Telegram — frontend

Frontend React/Vite do site `https://putarianotelegram.net`.

## Variáveis de ambiente

O site usa a API no mesmo domínio por padrão. Nesse cenário, não defina `VITE_API_URL`: as requisições são feitas para `/api/...` e o servidor da hospedagem deve encaminhá-las ao backend.

Defina `VITE_API_URL` somente se a API estiver em outro domínio HTTPS:

```env
VITE_API_URL=https://api.exemplo.com
```

Toda variável com prefixo `VITE_` fica incorporada ao JavaScript e é pública. Nunca coloque tokens, senhas, chaves privadas ou outros segredos no frontend.

## Comandos

```bash
npm ci
npm run build
npm run preview
```

O servidor de produção precisa servir `index.html` para rotas que não correspondam a arquivos estáticos, permitindo que o React Router mostre as páginas internas e a tela 404.
