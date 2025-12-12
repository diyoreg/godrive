# 🚀 Быстрый старт GoDrive в новой среде

## Развёртывание за 3 шага

### 1️⃣ Настройка PostgreSQL

Убедитесь что PostgreSQL запущен. Для Docker:

```bash
docker run -d \
  --name godrive-postgres \
  -e POSTGRES_DB=questions \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  -v godrive-postgres-data:/var/lib/postgresql/data \
  --health-cmd="pg_isready -U postgres" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=5 \
  postgres:16-alpine
```

### 2️⃣ Настройка окружения

Создайте `.env` файл:

```env
# Сервер
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=questions
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# Cloudflare R2 (для картинок)
R2_BASE_URL=https://pub-eb6a742d1f3d48568bcc6d3c14150eaf.r2.dev
```

### 3️⃣ Установка и запуск

```bash
npm install
npm start
```

**Всё!** Система автоматически:
- ✅ Создаст все таблицы
- ✅ Импортирует 1130 вопросов × 3 языка
- ✅ Создаст тестовых пользователей
- ✅ Запустит сервер на http://localhost:3000

## 🔑 Тестовые учётные данные

После первого запуска доступны:
- **Админ**: admin / admin
- **Пользователь**: user / user

## 📦 Что делает автоматическая инициализация

При первом запуске `npm start` система проверяет БД и если таблиц нет, автоматически:

1. Создаёт 8 таблиц:
   - users (пользователи)
   - user_progress (прогресс по билетам)
   - user_statistics (общая статистика)
   - user_answers (история ответов)
   - user_mistake_stats (статистика ошибок)
   - questions_uz (вопросы на узбекском)
   - questions_ru (вопросы на русском)
   - questions_uzk (вопросы на кириллице)

2. Создаёт индексы для оптимизации

3. Импортирует вопросы из `data/questions.json`:
   - 1130 вопросов для каждого языка
   - Всего 3390 записей
   - Для вопросов без картинки подставляет defaultpic.webp

4. Создаёт тестовых пользователей

## 🐳 Docker Compose (опционально)

Можно использовать docker-compose.yml:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: godrive-postgres
    environment:
      POSTGRES_DB: questions
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - godrive-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  godrive-postgres-data:
```

Запуск:
```bash
docker-compose up -d
npm start
```

## 🔧 Дополнительные команды

```bash
# Ручная инициализация БД (если нужно пересоздать)
npm run init-db

# Режим разработки с hot-reload
npm run dev

# Проверка таблиц в БД
docker exec -it godrive-postgres psql -U postgres -d questions -c "\dt"

# Количество вопросов
docker exec -it godrive-postgres psql -U postgres -d questions -c "SELECT COUNT(*) FROM questions_uz;"
```

## ⚠️ Важные моменты

1. **Источник данных**: `data/questions.json` - хранится в git
2. **Автоинициализация**: работает при каждом запуске если БД пуста
3. **Безопасность**: смените JWT_SECRET в продакшене
4. **Порт**: по умолчанию 3000, можно изменить в .env

## 🌍 Развёртывание в продакшене

Для Railway, Render, Heroku и других:

1. Добавьте PostgreSQL addon
2. Настройте переменные окружения (DATABASE_URL или отдельные POSTGRES_*)
3. Система автоматически инициализирует БД при первом запуске

**Никаких миграций или SQL-скриптов вручную!**
