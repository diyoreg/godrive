const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'godrive.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

class DatabaseInitializer {
    constructor() {
        this.db = null;
    }

    async initializeDatabase() {
        try {
            console.log('🗄️  Инициализация базы данных SQLite...');
            
            // Создаем подключение к БД
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('❌ Ошибка подключения к БД:', err.message);
                    throw err;
                }
                console.log('✅ Подключение к SQLite установлено');
            });

            // Читаем и выполняем схему БД
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
            await this.executeSql(schema);
            
            // Создаем администратора по умолчанию
            await this.createDefaultAdmin();
            
            // Создаем тестовых пользователей
            await this.createTestUsers();
            
            console.log('🎉 База данных успешно инициализирована!');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации БД:', error);
            throw error;
        }
    }

    executeSql(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async createDefaultAdmin() {
        const hashedPassword = await bcrypt.hash('admin', 10);
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR IGNORE INTO users (username, password, name, role)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, ['admin', hashedPassword, 'Администратор', 'admin'], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('👤 Администратор создан (ID:', this.lastID, ')');
                    resolve(this.lastID);
                }
            });
        });
    }

    async createTestUsers() {
        const testUsers = [
            { username: 'user', password: 'user', name: 'Пользователь' }
        ];

        for (const user of testUsers) {
            try {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                await new Promise((resolve, reject) => {
                    const query = `
                        INSERT OR IGNORE INTO users (username, password, name, role)
                        VALUES (?, ?, ?, ?)
                    `;
                    
                    this.db.run(query, [user.username, hashedPassword, user.name, 'user'], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            if (this.lastID > 0) {
                                console.log(`👤 Пользователь ${user.username} создан (ID: ${this.lastID})`);
                            }
                            resolve(this.lastID);
                        }
                    });
                });
            } catch (error) {
                console.error(`❌ Ошибка создания пользователя ${user.username}:`, error);
            }
        }
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Ошибка закрытия БД:', err.message);
                } else {
                    console.log('✅ Соединение с БД закрыто');
                }
            });
        }
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