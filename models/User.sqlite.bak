const db = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.name = data.name;
        this.role = data.role || 'user';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Создание нового пользователя
    static async create(userData) {
        try {
            const { username, password, name, role = 'user' } = userData;
            
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const result = await db.run(`
                INSERT INTO users (username, password, name, role)
                VALUES (?, ?, ?, ?)
            `, [username, hashedPassword, name, role]);
            
            // Создаем настройки пользователя по умолчанию
            await db.run(`
                INSERT INTO user_settings (user_id, language, notifications)
                VALUES (?, 'ru', 1)
            `, [result.id]);
            
            return await User.findById(result.id);
        } catch (error) {
            throw new Error(`Ошибка создания пользователя: ${error.message}`);
        }
    }

    // Поиск пользователя по ID
    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
            return row ? new User(row) : null;
        } catch (error) {
            throw new Error(`Ошибка поиска пользователя по ID: ${error.message}`);
        }
    }

    // Поиск пользователя по username
    static async findByUsername(username) {
        try {
            const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
            return row ? new User(row) : null;
        } catch (error) {
            throw new Error(`Ошибка поиска пользователя по username: ${error.message}`);
        }
    }

    // Получение всех пользователей
    static async findAll() {
        try {
            const rows = await db.all('SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC');
            return rows.map(row => new User(row));
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
            const { name } = updateData;
            
            await db.run(`
                UPDATE users 
                SET name = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [name, this.id]);
            
            this.name = name;
            this.updated_at = new Date();
            
            return this;
        } catch (error) {
            throw new Error(`Ошибка обновления профиля: ${error.message}`);
        }
    }

    // Изменение пароля
    async changePassword(newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await db.run(`
                UPDATE users 
                SET password = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [hashedPassword, this.id]);
            
            this.password = hashedPassword;
            this.updated_at = new Date();
            
            return this;
        } catch (error) {
            throw new Error(`Ошибка изменения пароля: ${error.message}`);
        }
    }

    // Удаление пользователя
    static async delete(id) {
        try {
            // Проверяем, что это не администратор
            const user = await User.findById(id);
            if (user && user.username === 'admin') {
                throw new Error('Нельзя удалить аккаунт администратора');
            }
            
            const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            throw new Error(`Ошибка удаления пользователя: ${error.message}`);
        }
    }

    // Получение настроек пользователя
    async getSettings() {
        try {
            const settings = await db.get(`
                SELECT language, notifications, updated_at
                FROM user_settings
                WHERE user_id = ?
            `, [this.id]);
            
            return settings || { language: 'ru', notifications: true };
        } catch (error) {
            throw new Error(`Ошибка получения настроек: ${error.message}`);
        }
    }

    // Обновление настроек пользователя
    async updateSettings(settingsData) {
        try {
            const { language, notifications } = settingsData;
            
            await db.run(`
                INSERT OR REPLACE INTO user_settings (user_id, language, notifications, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [this.id, language, notifications ? 1 : 0]);
            
            return await this.getSettings();
        } catch (error) {
            throw new Error(`Ошибка обновления настроек: ${error.message}`);
        }
    }

    // Очистка данных пользователя (прогресс и статистика)
    async clearUserData() {
        try {
            await db.transaction(async () => {
                // Удаляем прогресс по билетам
                await db.run('DELETE FROM user_progress WHERE user_id = ?', [this.id]);
                
                // Удаляем сессии
                await db.run('DELETE FROM user_sessions WHERE user_id = ?', [this.id]);
            });
            
            return true;
        } catch (error) {
            throw new Error(`Ошибка очистки данных пользователя: ${error.message}`);
        }
    }

    // Преобразование в объект без пароля
    toSafeObject() {
        const { password, ...safeUser } = this;
        return safeUser;
    }
}

module.exports = User;