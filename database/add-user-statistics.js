const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
});

async function addUserStatisticsTable() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Добавление таблицы user_statistics...');
        
        await client.query('BEGIN');
        
        // Создаем таблицу статистики пользователей
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_statistics (
                user_id INTEGER PRIMARY KEY,
                time_spent_seconds INTEGER DEFAULT 0,
                total_questions_answered INTEGER DEFAULT 0,
                correct_answers INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('✅ Таблица user_statistics создана');
        
        // Создаем индекс
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id 
            ON user_statistics(user_id);
        `);
        
        console.log('✅ Индекс создан');
        
        await client.query('COMMIT');
        
        console.log('\n📊 Миграция выполнена успешно!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка миграции:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Запуск миграции
addUserStatisticsTable()
    .then(() => {
        console.log('✨ Процесс завершен');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Критическая ошибка:', error);
        process.exit(1);
    });
