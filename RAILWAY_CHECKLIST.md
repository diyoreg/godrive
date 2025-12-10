# 🚂 Railway Deployment Checklist

## 1. Подключение репозитория
- ✅ Зайти на railway.app
- ✅ New Project → Deploy from GitHub
- ✅ Выбрать репозиторий `diyoreg/godrive`

## 2. Настройка PostgreSQL
- ✅ Add Service → PostgreSQL
- ✅ Скопировать credentials из PostgreSQL service
- ✅ Вставить в Environment Variables основного сервиса

## 3. Environment Variables (обязательные)

```bash
# PostgreSQL (из Railway PostgreSQL service)
POSTGRES_HOST=monorail.proxy.rlwy.net
POSTGRES_PORT=12345
POSTGRES_DB=railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=abc123xyz

# JWT (сгенерируй случайную строку)
JWT_SECRET=your-super-secret-key-min-32-chars-recommended

# Node (опционально)
NODE_ENV=production
PORT=3000
```

## 4. После успешного деплоя

### Запустить миграции (в Railway CLI или через Terminal):

```bash
# 1. Добавить колонку favorites
node database/add-favorites-column.js

# 2. Добавить таблицу user_statistics  
node database/add-user-statistics.js
```

### Или через Railway CLI:
```bash
railway run node database/add-favorites-column.js
railway run node database/add-user-statistics.js
```

## 5. Проверка работы

Проверь эти endpoints:
- ✅ `https://your-app.railway.app/` → главная страница
- ✅ `https://your-app.railway.app/api/health` → `{"status": "ok"}`
- ✅ `https://your-app.railway.app/login.html` → страница входа

## 6. Первый запуск

При первом запуске автоматически:
- ✅ Создаётся администратор: `admin` / `admin123`
- ✅ Инициализируются таблицы users и user_progress

## 7. Важные файлы в репозитории

- ✅ `Procfile` - команда запуска для Railway
- ✅ `package.json` - зависимости и скрипты
- ✅ `server.js` - точка входа
- ✅ `.env.example` - пример переменных окружения (НЕ пушить реальный .env!)

## 8. Troubleshooting

### Если сервер не стартует:
1. Проверь логи в Railway: Settings → Logs
2. Убедись, что все env variables установлены
3. Проверь, что PostgreSQL service запущен

### Если ошибки с БД:
1. Проверь connection string в POSTGRES_* переменных
2. Убедись, что PostgreSQL доступен (можно протестировать через Railway CLI)
3. Запусти миграции вручную

### Если 404 на статику:
- Убедись, что папки `data/`, `images/`, `css/`, `js/` запушены в git

## 9. Автодеплой

Railway автоматически деплоит при каждом push в `main` branch:
```bash
git add .
git commit -m "your changes"
git push origin main
# Railway автоматически задеплоит изменения
```

## 10. Custom Domain (опционально)

Settings → Domains → Add Custom Domain
- Добавь свой домен
- Настрой DNS records как указано Railway
- Подожди 5-10 минут на распространение DNS

---

## Быстрый старт (TL;DR)

1. Создай проект в Railway из GitHub
2. Добавь PostgreSQL service
3. Установи 6 env variables
4. Подожди деплоя (~2-3 минуты)
5. Запусти 2 миграции
6. Готово! 🎉
