const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const progressRoutes = require('./routes/progress');
const questionsRoutes = require('./routes/questions');

// Инициализация приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware безопасности
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", "https://*.railway.app"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "https://pub-eb6a742d1f3d48568bcc6d3c14150eaf.r2.dev"]
        }
    }
}));

// CORS настройки
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['http://localhost:3000', 'http://127.0.0.1:3000'] 
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // лимит запросов
    message: {
        success: false,
        message: 'Слишком много запросов. Попробуйте позже.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Парсинг тела запросов (ДО всех маршрутов!)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Маршрут для сохранения вопросов (ДО rate limiter!)
app.post('/api/save-question', async (req, res) => {
    console.log('📝 Получен запрос на сохранение вопроса');
    console.log('Body:', req.body);
    
    try {
        const fs = require('fs').promises;
        const { filename, data } = req.body;
        
        if (!filename || !data) {
            console.log('❌ Отсутствуют обязательные поля');
            return res.status(400).json({
                success: false,
                message: 'Отсутствуют обязательные поля'
            });
        }
        
        // Проверка имени файла
        if (!/^q\d{4}\.json$/.test(filename)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный формат имени файла'
            });
        }
        
        const filePath = path.join(__dirname, 'data', 'questions', filename);
        
        // Сохраняем с красивым форматированием
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`✓ Сохранен вопрос: ${filename}`);
        
        res.json({
            success: true,
            message: 'Вопрос успешно сохранен'
        });
    } catch (error) {
        console.error('Ошибка сохранения вопроса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сохранения вопроса'
        });
    }
});

// Rate limiter (ПОСЛЕ наших маршрутов)
app.use('/api/', limiter);

// Статические файлы (frontend)
app.use(express.static(path.join(__dirname), {
    // Исключаем backend файлы из статики
    ignore: [
        'node_modules/**',
        'database/**',
        'routes/**',
        'models/**',
        'middleware/**',
        'package.json',
        'package-lock.json',
        'server.js'
    ]
}));

// Middleware логирования
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent');
    
    console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
    next();
});

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/questions', questionsRoutes);

// Маршрут для проверки здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'GoDrive API работает',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Обработка SPA маршрутов (для фронтенда)
app.get('*', (req, res) => {
    // Если запрос к API, но маршрут не найден
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API маршрут не найден'
        });
    }
    
    // Для всех остальных маршрутов отправляем index.html
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Глобальная обработка ошибок
app.use((error, req, res, next) => {
    console.error('Необработанная ошибка:', error);
    
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Внутренняя ошибка сервера' 
            : error.message,
        timestamp: new Date().toISOString()
    });
});

// Обработка 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API маршрут не найден'
    });
});

// Инициализация сервера
async function startServer() {
    try {
        // Проверяем подключение к БД
        const db = require('./database/connection');
        
        try {
            await db.checkTables();
        } catch (error) {
            // Если таблиц нет - инициализируем БД
            console.log('⚠️  Таблицы не найдены, инициализация базы данных...');
            const DatabaseInitializer = require('./database/init');
            const initializer = new DatabaseInitializer();
            await initializer.initializeDatabase();
            initializer.close();
            console.log('✅ База данных инициализирована');
        }
        
        // Запускаем сервер
        app.listen(PORT, () => {
            console.log('🚀 ========================================');
            console.log('🚀  GoDrive Backend Server запущен!');
            console.log('🚀 ========================================');
            console.log(`🌐 Сервер: http://localhost:${PORT}`);
            console.log(`🔗 API: http://localhost:${PORT}/api/health`);
            console.log(`📱 Frontend: http://localhost:${PORT}`);
            console.log('🚀 ========================================');
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('🔧 Режим разработки активен');
                console.log('🔧 CORS разрешен для всех источников');
                console.log('🔧 Подробные ошибки включены');
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Получен сигнал SIGTERM. Завершение работы сервера...');
    
    try {
        const db = require('./database/connection');
        await db.close();
        console.log('✅ База данных закрыта');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('🔄 Получен сигнал SIGINT. Завершение работы сервера...');
    
    try {
        const db = require('./database/connection');
        await db.close();
        console.log('✅ База данных закрыта');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
});

// Запуск сервера
startServer();

module.exports = app;