// Тестовый скрипт для проверки работы PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres123',
});

async function testConnection() {
    let client;
    
    try {
        console.log('🔌 Подключаюсь к PostgreSQL...');
        console.log(`   Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.POSTGRES_PORT || 5432}`);
        console.log(`   Database: ${process.env.POSTGRES_DB || 'questions'}`);
        console.log(`   User: ${process.env.POSTGRES_USER || 'postgres'}\n`);
        
        client = await pool.connect();
        console.log('✅ Подключение успешно!\n');
        
        // Проверка версии PostgreSQL
        const versionResult = await client.query('SELECT version()');
        console.log('📊 Версия PostgreSQL:');
        console.log(`   ${versionResult.rows[0].version}\n`);
        
        // Проверка существования таблиц
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 Существующие таблицы:');
        if (tablesResult.rows.length === 0) {
            console.log('   ⚠️  Таблицы не найдены! Нужно применить схему.\n');
        } else {
            tablesResult.rows.forEach(row => {
                console.log(`   ✓ ${row.table_name}`);
            });
            console.log('');
        }
        
        // Если таблицы есть, показываем статистику
        if (tablesResult.rows.length > 0) {
            console.log('📈 Статистика базы данных:');
            
            // Количество вопросов
            try {
                const questionsCount = await client.query('SELECT COUNT(*) FROM questions');
                console.log(`   Вопросов: ${questionsCount.rows[0].count}`);
            } catch (err) {
                console.log(`   Вопросов: таблица не создана`);
            }
            
            // Количество переводов
            try {
                const translationsCount = await client.query('SELECT COUNT(*) FROM question_translations');
                console.log(`   Переводов: ${translationsCount.rows[0].count}`);
            } catch (err) {
                console.log(`   Переводов: таблица не создана`);
            }
            
            // Количество вариантов ответов
            try {
                const optionsCount = await client.query('SELECT COUNT(*) FROM question_options');
                console.log(`   Вариантов ответов: ${optionsCount.rows[0].count}`);
            } catch (err) {
                console.log(`   Вариантов ответов: таблица не создана`);
            }
            
            // Количество билетов
            try {
                const ticketsCount = await client.query('SELECT COUNT(*) FROM tickets');
                console.log(`   Билетов: ${ticketsCount.rows[0].count}`);
            } catch (err) {
                console.log(`   Билетов: таблица не создана`);
            }
            
            console.log('');
        }
        
        // Тест простого запроса
        console.log('🧪 Тестирование запроса...');
        const testResult = await client.query('SELECT 1 + 1 as result');
        console.log(`   Результат: 1 + 1 = ${testResult.rows[0].result}`);
        console.log('   ✅ Запросы работают!\n');
        
        console.log('✨ Все проверки пройдены успешно!');
        
    } catch (err) {
        console.error('❌ Ошибка подключения:', err.message);
        console.error('\n💡 Возможные причины:');
        console.error('   1. PostgreSQL не запущен');
        console.error('   2. Неверные учетные данные в .env');
        console.error('   3. База данных не создана');
        console.error('   4. Порт 5432 занят или заблокирован\n');
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// Запуск теста
testConnection();
