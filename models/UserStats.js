const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

class UserStats {
    constructor(data = {}) {
        this.user_id = data.user_id;
        this.time_spent_seconds = data.time_spent_seconds || 0;
        this.total_questions_answered = data.total_questions_answered || 0;
        this.correct_answers = data.correct_answers || 0;
        this.updated_at = data.updated_at;
    }

    // Получить статистику пользователя
    static async getByUserId(userId) {
        try {
            const result = await pool.query(
                'SELECT * FROM user_statistics WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                // Создаем запись если не существует
                return await this.create(userId);
            }

            return new UserStats(result.rows[0]);
        } catch (error) {
            throw new Error(`Ошибка получения статистики: ${error.message}`);
        }
    }

    // Создать новую запись статистики
    static async create(userId) {
        try {
            const result = await pool.query(
                `INSERT INTO user_statistics (user_id, time_spent_seconds, total_questions_answered, correct_answers)
                 VALUES ($1, 0, 0, 0)
                 RETURNING *`,
                [userId]
            );

            return new UserStats(result.rows[0]);
        } catch (error) {
            throw new Error(`Ошибка создания статистики: ${error.message}`);
        }
    }

    // Обновить время
    static async addTime(userId, seconds) {
        try {
            const result = await pool.query(
                `INSERT INTO user_statistics (user_id, time_spent_seconds, total_questions_answered, correct_answers)
                 VALUES ($1, $2, 0, 0)
                 ON CONFLICT (user_id) 
                 DO UPDATE SET 
                    time_spent_seconds = user_statistics.time_spent_seconds + $2,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [userId, seconds]
            );

            return new UserStats(result.rows[0]);
        } catch (error) {
            throw new Error(`Ошибка обновления времени: ${error.message}`);
        }
    }

    // Обновить статистику ответов
    static async addAnswers(userId, totalAnswered, correctAnswers) {
        try {
            const result = await pool.query(
                `INSERT INTO user_statistics (user_id, time_spent_seconds, total_questions_answered, correct_answers)
                 VALUES ($1, 0, $2, $3)
                 ON CONFLICT (user_id) 
                 DO UPDATE SET 
                    total_questions_answered = user_statistics.total_questions_answered + $2,
                    correct_answers = user_statistics.correct_answers + $3,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [userId, totalAnswered, correctAnswers]
            );

            return new UserStats(result.rows[0]);
        } catch (error) {
            throw new Error(`Ошибка обновления ответов: ${error.message}`);
        }
    }

    // Обновить все статистики одновременно
    static async updateAll(userId, timeSeconds, totalAnswered, correctAnswers) {
        try {
            const result = await pool.query(
                `INSERT INTO user_statistics (user_id, time_spent_seconds, total_questions_answered, correct_answers)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id) 
                 DO UPDATE SET 
                    time_spent_seconds = user_statistics.time_spent_seconds + $2,
                    total_questions_answered = user_statistics.total_questions_answered + $3,
                    correct_answers = user_statistics.correct_answers + $4,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [userId, timeSeconds, totalAnswered, correctAnswers]
            );

            return new UserStats(result.rows[0]);
        } catch (error) {
            throw new Error(`Ошибка обновления статистики: ${error.message}`);
        }
    }

    // Получить форматированное время
    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}д ${remainingHours}ч ${minutes}м ${secs}с`;
        }
        
        if (hours > 0) {
            return `${hours}ч ${minutes}м ${secs}с`;
        }
        
        if (minutes > 0) {
            return `${minutes}м ${secs}с`;
        }
        
        return `${secs}с`;
    }

    // Получить процент правильных ответов
    static getAccuracy(correctAnswers, totalAnswered) {
        if (totalAnswered === 0) return 0;
        return Math.round((correctAnswers / totalAnswered) * 100 * 10) / 10; // Один знак после запятой
    }

    // Подсчитать количество дней с даты регистрации
    static getDaysSinceJoin(joinDate) {
        const now = new Date();
        const join = new Date(joinDate);
        const diffTime = Math.abs(now - join);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
}

module.exports = UserStats;
