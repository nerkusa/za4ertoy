# За Чертой · 2035 — компаньон

Форк Nox Aeterna (`nerkusa/noxaeterna2-0`). Боевая логика — из базы, её не
переписываем. Правила игры — в `src/data` и `src/utils` (`character.js`,
`data/traits.js` — эффекты, `data/gear.js` — кассеты и солюшны).

## Проверка

```bash
CI=true npm test -- --watchAll=false
CI=false npm run build
```

## Деплой

Пользователь деплоит вручную на своём сервере. Команда:

```bash
cd /opt/zachertoy-companion && git pull && npm run build
```

Backend (`server/index.js`) перезапускается отдельно, только если менялся сам backend:

```bash
sudo systemctl restart zachertoy-server
```

После каждого пуша явно говори пользователю, нужен ли перезапуск backend'а или достаточно пересборки фронта.
