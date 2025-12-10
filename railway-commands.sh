#!/bin/bash
# Railway Quick Setup Commands

echo "🚂 GoDrive Railway Deployment Commands"
echo "======================================="
echo ""

# 1. Установка Railway CLI (если нужно)
echo "📦 1. Установка Railway CLI (опционально):"
echo "npm i -g @railway/cli"
echo ""

# 2. Логин в Railway
echo "🔐 2. Логин в Railway:"
echo "railway login"
echo ""

# 3. Связывание с проектом
echo "🔗 3. Связывание с проектом:"
echo "railway link"
echo ""

# 4. Добавление PostgreSQL service
echo "🗄️ 4. Добавление PostgreSQL (через Railway UI):"
echo "- Зайти на railway.app/project"
echo "- Add Service → PostgreSQL"
echo "- Railway автоматически создаст БД"
echo ""

# 5. Установка переменных окружения
echo "⚙️ 5. Установка переменных окружения:"
echo "# Скопируй credentials из PostgreSQL service"
echo "railway variables set POSTGRES_HOST=xxx.railway.app"
echo "railway variables set POSTGRES_PORT=5432"
echo "railway variables set POSTGRES_DB=railway"
echo "railway variables set POSTGRES_USER=postgres"
echo "railway variables set POSTGRES_PASSWORD=xxx"
echo ""
echo "# JWT Secret (сгенерируй случайную строку)"
echo "railway variables set JWT_SECRET=your-super-secret-key-min-32-chars"
echo ""
echo "# Опциональные"
echo "railway variables set NODE_ENV=production"
echo "railway variables set PORT=3000"
echo ""

# 6. Деплой
echo "🚀 6. Деплой (автоматически при git push):"
echo "git push origin main"
echo "# Railway автоматически задеплоит"
echo ""

# 7. Миграции после первого деплоя
echo "📊 7. Запуск миграций (ВАЖНО!):"
echo "railway run node database/add-favorites-column.js"
echo "railway run node database/add-user-statistics.js"
echo ""

# 8. Проверка логов
echo "📜 8. Проверка логов:"
echo "railway logs"
echo ""

# 9. Открыть приложение
echo "🌐 9. Открыть приложение:"
echo "railway open"
echo ""

# 10. Проверка статуса
echo "✅ 10. Проверка endpoint'ов:"
echo "curl https://your-project.railway.app/api/health"
echo ""

echo "======================================="
echo "📚 Полная документация:"
echo "- RAILWAY_CHECKLIST.md"
echo "- RAILWAY.md"
echo "- DEPLOYMENT_SUMMARY.md"
echo ""
echo "🎉 Удачи с деплоем!"
