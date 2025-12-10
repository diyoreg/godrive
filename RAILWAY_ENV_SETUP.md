# 🚂 Railway Environment Variables Setup

## ⚠️ ВАЖНО: Настройка переменных окружения

После создания PostgreSQL service в Railway, нужно **обязательно** настроить переменные окружения в вашем основном сервисе.

## 📋 Шаги настройки:

### 1. Зайти в PostgreSQL service
В Railway dashboard найдите ваш PostgreSQL service → вкладка **Variables**

### 2. Скопировать переменные
Найдите и скопируйте значения:
- `PGHOST` → используйте для `POSTGRES_HOST`
- `PGPORT` → используйте для `POSTGRES_PORT`
- `PGDATABASE` → используйте для `POSTGRES_DB`
- `PGUSER` → используйте для `POSTGRES_USER`
- `PGPASSWORD` → используйте для `POSTGRES_PASSWORD`

### 3. Добавить в ваш service (godrive app)
Перейдите в ваш основной service → вкладка **Variables** → **New Variable**

Добавьте следующие переменные:

```env
POSTGRES_HOST=<значение из PGHOST>
POSTGRES_PORT=<значение из PGPORT>
POSTGRES_DB=<значение из PGDATABASE>
POSTGRES_USER=<значение из PGUSER>
POSTGRES_PASSWORD=<значение из PGPASSWORD>

JWT_SECRET=<сгенерируйте случайную строку 32+ символов>
NODE_ENV=production
PORT=3000
```

### 4. Или использовать Railway Reference Variables

Более простой способ - использовать ссылки на переменные PostgreSQL service:

```env
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_DB=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}

JWT_SECRET=your-secret-key-here-make-it-long-and-random-32-chars
NODE_ENV=production
PORT=3000
```

Замените `Postgres` на фактическое имя вашего PostgreSQL service в Railway.

## ✅ Проверка

После добавления переменных Railway автоматически передеплоит приложение.

В логах вы должны увидеть:
```
📊 PostgreSQL Configuration:
  Host: <ваш-railway-postgres-host>
  Port: 5432
  Database: railway
  User: postgres
  Password: ***
🔌 Проверка подключения к PostgreSQL...
✅ Подключение к PostgreSQL успешно
```

## 🐛 Troubleshooting

**Ошибка: `ECONNREFUSED ::1:5432`**
- Это означает что переменные окружения не установлены
- Приложение пытается подключиться к localhost вместо Railway PostgreSQL
- Проверьте что все переменные `POSTGRES_*` правильно установлены

**Ошибка: `password authentication failed`**
- Проверьте что `POSTGRES_PASSWORD` правильно скопирован
- Убедитесь что нет лишних пробелов в начале/конце значений

**Ошибка: `database "railway" does not exist`**
- Проверьте что `POSTGRES_DB` соответствует имени БД в PostgreSQL service
- Обычно это `railway`
