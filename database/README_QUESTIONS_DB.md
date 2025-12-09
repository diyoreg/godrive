# PostgreSQL Questions Database для GoDrive

## 📊 Архитектура базы данных

База данных спроектирована для работы с **70,000-100,000 пользователей** с оптимизацией производительности и масштабируемости.

### Основные таблицы:

1. **questions** - Основная информация о вопросах (1130 вопросов)
2. **question_translations** - Переводы на 3 языка (uz, ru, uzk)
3. **question_options** - Варианты ответов (по 5 вариантов на вопрос)
4. **question_statistics** - Статистика ответов (для адаптивной сложности)

> **Примечание:** Билеты генерируются динамически на клиенте/сервере, они не хранятся в БД.

### Оптимизации:

✅ **Нормализованная структура** - предотвращает дублирование данных
✅ **Индексы** - ускоряют запросы в 10-100 раз
✅ **Views** - готовые представления для быстрого доступа
✅ **Триггеры** - автоматический расчет сложности вопросов
✅ **Connection Pool** - до 20 одновременных соединений

---

## 🚀 Установка и настройка

### 1. Создание базы данных PostgreSQL

#### Railway (рекомендуется):
```bash
# В Railway Dashboard:
# 1. New Project → Add Database → PostgreSQL
# 2. Скопируйте DATABASE_URL
```

#### Локально:
```bash
# Установите PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Создайте базу данных
createdb questions

# Или через psql:
psql -U postgres
CREATE DATABASE questions;
\q
```

### 2. Применение схемы

```bash
# Railway:
psql $DATABASE_URL -f database/questions_schema.sql

# Локально:
psql -U postgres -d questions -f database/questions_schema.sql
```

### 3. Настройка переменных окружения

```bash
# .env (локально)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=questions
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Railway (добавьте переменные в Settings):
# DATABASE_URL автоматически создается
# Или используйте отдельные переменные:
QUESTIONS_DB_URL=postgresql://user:password@host:port/questions
```

### 4. Установка зависимостей

```bash
npm install pg dotenv
```

### 5. Импорт данных

```bash
# Импортируем 1130 вопросов из JSON в PostgreSQL
node database/import-questions.js
```

Ожидаемый вывод:
```
🚀 Начинаем импорт вопросов в PostgreSQL...
📊 Найдено вопросов: 1130
✅ Импортировано: 50 / 1130
✅ Импортировано: 100 / 1130
...
✅ Импорт завершен!
📈 Успешно импортировано: 1130
❌ Ошибок: 0

📊 Статистика базы данных:
   Всего вопросов: 1130
   Уникальных вопросов: 1130
   Переводов: 3390 (1130 × 3 языка)
   Вариантов ответов: ~5650 (в среднем 5 вариантов на вопрос)
```

---

## 📖 Примеры использования

### Получение вопроса на русском языке:

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Получить вопрос с вариантами ответов
async function getQuestion(questionId, language = 'ru') {
    const result = await pool.query(`
        SELECT * FROM questions_${language}
        WHERE question_id = $1
    `, [questionId]);
    
    return result.rows[0];
}

// Пример результата:
{
  id: 1,
  question_id: 1,
  image_url: 'https://pub-eb6a742d1f3d48568bcc6d3c14150eaf.r2.dev/q0001.webp',
  correct_answer: 4,
  difficulty_level: 1,
  question_text: 'Какому автомобилю разрешается остановка...',
  explanation: 'Приложение №1 к ПДД...',
  options: ['Красному', 'Обоим автомобилям', 'Ни одному', '...'],
  total_attempts: 0,
  correct_attempts: 0,
  difficulty_score: 0
}
```

### Получение случайных вопросов для билета:

```javascript
async function getRandomQuestions(count = 20, language = 'ru') {
    const result = await pool.query(`
        SELECT * FROM questions_${language}
        ORDER BY RANDOM()
        LIMIT $1
    `, [count]);
    
    return result.rows;
}
```

### Обновление статистики после ответа:

```javascript
async function recordAnswer(questionId, isCorrect) {
    await pool.query(`
        UPDATE question_statistics
        SET 
            total_attempts = total_attempts + 1,
            ${isCorrect ? 'correct_attempts = correct_attempts + 1' : 'incorrect_attempts = incorrect_attempts + 1'}
        WHERE question_id = $1
    `, [questionId]);
}
```

### Получение сложных вопросов:

```javascript
async function getDifficultQuestions(limit = 10, language = 'ru') {
    const result = await pool.query(`
        SELECT * FROM questions_${language}
        WHERE total_attempts > 100
        ORDER BY difficulty_score DESC
        LIMIT $1
    `, [limit]);
    
    return result.rows;
}
```

---

## 🔒 Безопасность

### Connection Pool:
```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // максимум соединений
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

### Подготовленные запросы (защита от SQL-инъекций):
```javascript
// ✅ Правильно
await pool.query('SELECT * FROM questions WHERE question_id = $1', [questionId]);

// ❌ Неправильно (SQL-инъекция)
await pool.query(`SELECT * FROM questions WHERE question_id = ${questionId}`);
```

---

## 📈 Производительность

### Оптимизация запросов:

1. **Используйте Views** вместо JOIN на клиенте
2. **Индексы** уже созданы для всех часто используемых полей
3. **Connection Pool** переиспользует соединения
4. **LIMIT** для ограничения результатов

### Мониторинг производительности:

```sql
-- Самые медленные запросы
SELECT 
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Использование индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 🎯 Следующие шаги

1. ✅ Создать базу PostgreSQL (локально через Docker)
2. ✅ Применить схему (`questions_schema.sql`)
3. ✅ Импортировать данные (`node database/import-questions.js`)
4. ⬜ Создать API endpoints для получения вопросов
5. ⬜ Реализовать логику генерации билетов на сервере
6. ⬜ Интегрировать с фронтендом
7. ⬜ Задеплоить на Railway для продакшена

---

## 🆘 Troubleshooting

### Ошибка подключения:
```bash
Error: connect ECONNREFUSED
```
**Решение:** Проверьте `DATABASE_URL` и доступность PostgreSQL

### Медленные запросы:
```bash
Query took 2000ms
```
**Решение:** 
- Проверьте наличие индексов: `\d questions`
- Используйте EXPLAIN ANALYZE для анализа запроса
- Увеличьте размер connection pool

### Конфликт при импорте:
```bash
ERROR: duplicate key value violates unique constraint
```
**Решение:** Используйте `ON CONFLICT` в запросах (уже реализовано)

---

## 📚 Дополнительные ресурсы

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Driver](https://node-postgres.com/)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
