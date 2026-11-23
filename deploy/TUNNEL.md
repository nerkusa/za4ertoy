# Запуск с домашнего компьютера через Cloudflare Tunnel (Windows)

Сервер сам отдаёт и сайт, и WebSocket на одном порту (8788), а Cloudflare
даёт к нему внешний адрес. Пока компьютер включён и окна открыты — игра доступна.

## Один раз
1. Поставить Node.js LTS (nodejs.org) и Git (git-scm.com).
2. В PowerShell:
   ```
   git clone https://github.com/nerkusa/za4ertoy.git
   cd za4ertoy
   npm install
   npm run build
   cd server
   npm install
   winget install --id Cloudflare.cloudflared
   ```
   После установки cloudflared закрыть и снова открыть PowerShell.

## Перенести мир с VPS (по желанию)
В PowerShell, в папке `za4ertoy\server`:
```
scp root@94.125.100.244:/var/lib/zachertoy/data.json .
scp root@94.125.100.244:/var/lib/zachertoy/users.json .
```

## Каждый раз перед игрой
Окно 1 (папка `za4ertoy\server`):
```
$env:GM_LOGIN="логин"; $env:GM_PASSWORD="пароль"; node index.js
```
Окно 2:
```
cloudflared tunnel --url http://localhost:8788
```
В выводе будет адрес `https://….trycloudflare.com` — его и раздать игрокам.
Адрес меняется при каждом запуске cloudflared.

## Обновить приложение
```
git pull
npm run build
```
(в папке `za4ertoy`, затем перезапустить окно 1).

Мир хранится в `server\data.json` — его и стоит копировать для резервной копии.
