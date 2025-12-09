const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'godrive.db');

class Database {
    constructor() {
        this.db = null;
        this.connect();
    }

    connect() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к БД:', err.message);
                throw err;
            }
            console.log('✅ Подключение к SQLite установлено');
        });

        // Включаем поддержку внешних ключей
        this.db.run('PRAGMA foreign_keys = ON');
    }

    // Универсальный метод для выполнения SELECT запросов
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Универсальный метод для выполнения SELECT запросов (множественные результаты)
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Универсальный метод для выполнения INSERT/UPDATE/DELETE запросов
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    // Выполнение транзакции
    async transaction(callback) {
        return new Promise(async (resolve, reject) => {
            this.db.serialize(async () => {
                try {
                    await this.run('BEGIN TRANSACTION');
                    const result = await callback(this);
                    await this.run('COMMIT');
                    resolve(result);
                } catch (error) {
                    await this.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }

    // Закрытие подключения
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Соединение с БД закрыто');
                    resolve();
                }
            });
        });
    }

    // Проверка существования таблиц
    async checkTables() {
        try {
            const tables = await this.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);
            
            const tableNames = tables.map(t => t.name);
            console.log('📋 Найденные таблицы:', tableNames);
            
            return tableNames;
        } catch (error) {
            console.error('❌ Ошибка проверки таблиц:', error);
            throw error;
        }
    }
}

// Создаем единственный экземпляр (Singleton)
const database = new Database();

module.exports = database;