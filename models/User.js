const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

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

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.name = data.name;
        this.email = data.email;
        this.role = data.role || 'user';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Создание нового пользователя
    static async create(userData) {
        try {
            const { username, password, name, email, role = 'user' } = userData;
            
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const result = await pool.query(`
                INSERT INTO users (username, password, name, email, role)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [username, hashedPassword, name, email || null, role]);
            
            const userId = result.rows[0].id;
            
            // Создаем настройки пользователя по умолчанию
            await pool.query(`
                INSERT INTO user_settings (user_id, language, notifications)
                VALUES ($1, $2, $3)
            `, [userId, 'ru', true]);
            
            return new User(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('Пользователь с таким именем уже существует');
            }
            throw new Error(`Ошибка создания пользователя: ${error.message}`);
        }
    }

    // Поиск пользователя по ID
    static async findById(id) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows.length > 0 ? new User(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Ошибка поиска пользователя по ID: ${error.message}`);
        }
    }

    // Поиск пользователя по username
    static async findByUsername(username) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            return result.rows.length > 0 ? new User(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Ошибка поиска пользователя по username: ${error.message}`);
        }
    }

    // Поиск пользователя по email
    static async findByEmail(email) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows.length > 0 ? new User(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Ошибка поиска пользователя по email: ${error.message}`);
        }
    }

    // Получение всех пользователей
    static async findAll() {
        try {
            const result = await pool.query(`
                SELECT id, username, name, email, role, created_at 
                FROM users 
                ORDER BY created_at DESC
            `);
            return result.rows.map(row => new User(row));
        } catch (error) {
            throw new Error(`Ошибка получения списка пользователей: ${error.message}`);
        }
    }

    // Аутентификация пользователя
    static async authenticate(username, password) {
        try {
            const user = await User.findByUsername(username);
            if (!user) {
                return null;
            }
            
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return null;
            }
            
            return user;
        } catch (error) {
            throw new Error(`Ошибка аутентификации: ${error.message}`);
        }
    }

    // Обновление профиля пользователя
    async updateProfile(updateData) {
        try {
            const { name, email } = updateData;
            
            const result = await pool.query(`
                UPDATE users 
                SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `, [name, email || this.email, this.id]);
            
            if (result.rows.length > 0) {
                this.name = result.rows[0].name;
                this.email = result.rows[0].email;
                this.updated_at = result.rows[0].updated_at;
            }
            
            return this;
        } catch (error) {
            throw new Error(`Ошибка обновления профиля: ${error.message}`);
        }
    }

    // Изменение пароля
    async changePassword(oldPassword, newPassword) {
        try {
            // Проверяем старый пароль
            const isValid = await bcrypt.compare(oldPassword, this.password);
            if (!isValid) {
                throw new Error('Неверный текущий пароль');
            }
            
            // Хешируем новый пароль
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await pool.query(`
                UPDATE users 
                SET password = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [hashedPassword, this.id]);
            
            this.password = hashedPassword;
            return true;
        } catch (error) {
            throw new Error(`Ошибка изменения пароля: ${error.message}`);
        }
    }

    // Удаление пользователя
    static async delete(id) {
        try {
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
            return true;
        } catch (error) {
            throw new Error(`Ошибка удаления пользователя: ${error.message}`);
        }
    }

    // Получение настроек пользователя
    async getSettings() {
        try {
            const result = await pool.query(`
                SELECT * FROM user_settings WHERE user_id = $1
            `, [this.id]);
            
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            // Если таблица user_settings не существует, возвращаем дефолтные настройки
            console.warn('⚠️ Таблица user_settings не найдена, используем дефолтные настройки');
            return {
                user_id: this.id,
                language: 'ru',
                notifications: true
            };
        }
    }

    // Обновление настроек пользователя
    async updateSettings(settings) {
        try {
            const { language, notifications } = settings;
            
            await pool.query(`
                INSERT INTO user_settings (user_id, language, notifications)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id) DO UPDATE 
                SET language = $2, notifications = $3, updated_at = CURRENT_TIMESTAMP
            `, [this.id, language, notifications]);
            
            return await this.getSettings();
        } catch (error) {
            throw new Error(`Ошибка обновления настроек: ${error.message}`);
        }
    }

    // Получение статистики пользователя
    async getStatistics() {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(DISTINCT ticket_id) as tickets_attempted,
                    COUNT(CASE WHEN completed = true THEN 1 END) as tickets_completed,
                    AVG(CASE WHEN completed = true THEN score END) as average_score,
                    SUM(score) as total_score
                FROM user_progress
                WHERE user_id = $1
            `, [this.id]);
            
            return result.rows[0];
        } catch (error) {
            throw new Error(`Ошибка получения статистики: ${error.message}`);
        }
    }

    // Метод для сериализации (без пароля)
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            name: this.name,
            email: this.email,
            role: this.role,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = User;
