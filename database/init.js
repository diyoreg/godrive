const bcrypt = require('bcryptjs');
const pool = require('./connection');

class DatabaseInitializer {
    constructor() {
        this.pool = pool;
    }

    async initializeDatabase() {
        try {
            console.log('🗄️  Инициализация базы данных PostgreSQL...');
            
            // Проверяем подключение
            console.log('🔌 Проверка подключения к PostgreSQL...');
            await this.pool.query('SELECT NOW()');
            console.log('✅ Подключение к PostgreSQL успешно');
            
            // Создаем таблицы
            await this.createTables();
            
            // Создаем администратора по умолчанию
            await this.createDefaultAdmin();
            
            // Создаем тестового пользователя
            await this.createTestUser();
            
            console.log('🎉 База данных успешно инициализирована!');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации БД:', error.message);
            console.error('❌ Stack:', error.stack);
            throw error;
        }
    }

    async createTables() {
        const schema = `
            -- Таблица пользователей
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                favorites JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Таблица прогресса пользователей
            CREATE TABLE IF NOT EXISTS user_progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                ticket_id INTEGER NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                score INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 10,
                answers JSONB,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, ticket_id)
            );

            -- Индексы
            CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_progress_ticket_id ON user_progress(ticket_id);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        `;

        await this.pool.query(schema);
        console.log('✅ Таблицы созданы');
    }

    async createDefaultAdmin() {
        try {
            const hashedPassword = await bcrypt.hash('admin', 10);
            
            const query = `
                INSERT INTO users (username, password, name, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (username) DO NOTHING
                RETURNING id
            `;
            
            const result = await this.pool.query(query, ['admin', hashedPassword, 'Администратор', 'admin']);
            
            if (result.rows.length > 0) {
                console.log('👤 Администратор создан (admin/admin)');
            } else {
                console.log('ℹ️  Администратор уже существует');
            }
        } catch (error) {
            console.error('❌ Ошибка создания администратора:', error.message);
        }
    }

    async createTestUser() {
        try {
            const hashedPassword = await bcrypt.hash('user', 10);
            
            const query = `
                INSERT INTO users (username, password, name, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (username) DO NOTHING
                RETURNING id
            `;
            
            const result = await this.pool.query(query, ['user', hashedPassword, 'Пользователь', 'user']);
            
            if (result.rows.length > 0) {
                console.log('👤 Пользователь создан (user/user)');
            } else {
                console.log('ℹ️  Пользователь user уже существует');
            }
        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error.message);
        }
    }

    close() {
        // PostgreSQL pool закрывается автоматически
        console.log('✅ Инициализация завершена');
    }
}

// Если файл запускается напрямую
if (require.main === module) {
    const initializer = new DatabaseInitializer();
    
    initializer.initializeDatabase()
        .then(() => {
            console.log('🎯 Инициализация завершена успешно!');
            initializer.close();
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Критическая ошибка:', error);
            initializer.close();
            process.exit(1);
        });
}

module.exports = DatabaseInitializer;