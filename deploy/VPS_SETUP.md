# Разворачиваем «За Чертой · 2035» на VPS рядом с Nox Aeterna

Приложение ставится **отдельно** от Nox Aeterna: свой каталог, свой сервис,
свой порт (8788), свои файлы данных, свой поддомен. Nox Aeterna при этом
не трогаем.

Копируй команды как есть, меняя только `YOUR_DOMAIN`, логин и пароль мастера.

## 1. Поддомен

Нужен отдельный адрес, например второй домен на https://www.duckdns.org
(`zachertoy.duckdns.org`), который смотрит на тот же IP, что и Nox Aeterna.

## 2. Зависимости

Если Nox Aeterna уже работает на этом VPS, nginx, certbot, git и Node.js
стоят. Если сервер новый:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Клонируем и собираем

```bash
cd /opt
sudo git clone https://github.com/nerkusa/za4ertoy.git zachertoy-companion
cd zachertoy-companion

cd server
sudo npm install --omit=dev
cd ..

echo "REACT_APP_WS_URL=wss://YOUR_DOMAIN/ws" | sudo tee .env
sudo npm install
sudo npm run build
```

## 4. Данные и аккаунт мастера

Данные мира и логины лежат вне каталога с кодом, чтобы не смешиваться с
Nox Aeterna и не теряться при обновлении:

```bash
sudo mkdir -p /var/lib/zachertoy /etc/zachertoy
sudo chown -R www-data:www-data /var/lib/zachertoy
```

Логин и пароль мастера задаются в файле окружения (в коде их нет):

```bash
sudo tee /etc/zachertoy/server.env > /dev/null <<'ENV'
GM_LOGIN=master
GM_PASSWORD=придумай-свой-пароль
ENV
sudo chmod 600 /etc/zachertoy/server.env
```

Если `GM_LOGIN` или `GM_PASSWORD` не заданы, войти мастером нельзя — сервер
напишет об этом в лог при запуске.

## 5. Сервис

```bash
sudo cp deploy/zachertoy-server.service /etc/systemd/system/zachertoy-server.service
sudo systemctl daemon-reload
sudo systemctl enable --now zachertoy-server
sudo systemctl status zachertoy-server   # должно быть "active (running)"
```

## 6. Nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/zachertoy
sudo sed -i 's/YOUR_DOMAIN_HERE/YOUR_DOMAIN/' /etc/nginx/sites-available/zachertoy
sudo ln -s /etc/nginx/sites-available/zachertoy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## 7. Проверка

Открой `https://YOUR_DOMAIN`. Войди логином мастера: при первом входе в
новый мир сами добавятся стартовый каталог и бестиарий. Игроки
регистрируются сами.

Если что-то не так:

```bash
sudo systemctl status zachertoy-server
sudo journalctl -u zachertoy-server -f
sudo tail -f /var/log/nginx/error.log
```

## Обновление

Менялся только интерфейс (всё, кроме `server/`):

```bash
cd /opt/zachertoy-companion && sudo git pull && sudo npm install && sudo npm run build
```

Менялся `server/` — после этого ещё:

```bash
cd /opt/zachertoy-companion/server && sudo npm install --omit=dev && sudo systemctl restart zachertoy-server
```

## Резервная копия

Два файла: `/var/lib/zachertoy/data.json` (мир) и
`/var/lib/zachertoy/users.json` (логины, пароли хешированы).
