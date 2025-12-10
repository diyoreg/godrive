const { Pool } = require('pg');
require('dotenv').config();

// Логирование конфигурации подключения (без пароля)
console.log('📊 PostgreSQL Configuration:');
console.log('  Host:', process.env.POSTGRES_HOST || 'localhost');
console.log('  Port:', process.env.POSTGRES_PORT || 5432);
console.log('  Database:', process.env.POSTGRES_DB || 'questions');
console.log('  User:', process.env.POSTGRES_USER || 'postgres');
console.log('  Password:', process.env.POSTGRES_PASSWORD ? '***' : 'NOT SET');

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Проверка подключения при старте
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
    } else {
        console.log('✅ Подключение к PostgreSQL установлено');
        release();
    }
});

// Обработка ошибок пула
pool.on('error', (err) => {
    console.error('❌ Неожиданная ошибка PostgreSQL:', err);
});

class Database {
    constructor() {
        this.pool = pool;
    }

    // Универсальный метод для выполнения SELECT запросов (один результат)
    async get(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Database get error:', error);
            throw error;
        }
    }

    // Универсальный метод для выполнения SELECT запросов (множественные результаты)
    async all(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('Database all error:', error);
            throw error;
        }
    }

    // Универсальный метод для INSERT/UPDATE/DELETE
    async run(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return {
                id: result.rows[0]?.id,
                changes: result.rowCount,
                rows: result.rows
            };
        } catch (error) {
            console.error('Database run error:', error);
            throw error;
        }
    }

    // Выполнение запроса с возвратом результата
    async query(sql, params = []) {
        try {
            return await this.pool.query(sql, params);
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Транзакции
    async beginTransaction() {
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return client;
    }

    async commitTransaction(client) {
        await client.query('COMMIT');
        client.release();
    }

    async rollbackTransaction(client) {
        await client.query('ROLLBACK');
        client.release();
    }

    // Закрытие всех соединений
    async close() {
        await this.pool.end();
        console.log('✅ Соединение с PostgreSQL закрыто');
    }

    // Получение пула для прямого использования
    getPool() {
        return this.pool;
    }

    // Проверка наличия таблиц
    async checkTables() {
        const query = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `;
        const result = await this.pool.query(query);
        
        if (!result.rows[0].exists) {
            throw new Error('Таблица users не найдена');
        }
        
        return true;
    }
}

// Экспортируем единственный экземпляр и пул
const db = new Database();

module.exports = db;
module.exports.pool = pool;
