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

class Progress {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.ticket_id = data.ticket_id;
        this.completed = data.completed || false;
        this.score = data.score || 0;
        this.total_questions = data.total_questions || 10;
        this.answers = data.answers || {};
        this.started_at = data.started_at;
        this.completed_at = data.completed_at;
    }

    // Создание или обновление прогресса
    static async upsert(progressData) {
        try {
            const { user_id, ticket_id, completed, score, total_questions, answers } = progressData;
            
            const result = await pool.query(`
                INSERT INTO user_progress (user_id, ticket_id, completed, score, total_questions, answers, started_at, completed_at)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
                ON CONFLICT (user_id, ticket_id) 
                DO UPDATE SET 
                    completed = $3,
                    score = $4,
                    total_questions = $5,
                    answers = $6,
                    completed_at = $7
                RETURNING *
            `, [user_id, ticket_id, completed, score, total_questions, JSON.stringify(answers), completed ? new Date() : null]);
            
            return new Progress(result.rows[0]);
        } catch (error) {
            throw new Error(`Ошибка сохранения прогресса: ${error.message}`);
        }
    }

    // Получение прогресса пользователя по билету
    static async findByUserAndTicket(userId, ticketId) {
        try {
            const result = await pool.query(`
                SELECT * FROM user_progress 
                WHERE user_id = $1 AND ticket_id = $2
            `, [userId, ticketId]);
            
            if (result.rows.length > 0) {
                const progress = new Progress(result.rows[0]);
                // Парсим JSONB answers
                if (typeof progress.answers === 'string') {
                    progress.answers = JSON.parse(progress.answers);
                }
                return progress;
            }
            return null;
        } catch (error) {
            throw new Error(`Ошибка получения прогресса: ${error.message}`);
        }
    }

    // Получение всего прогресса пользователя
    static async findByUser(userId) {
        try {
            const result = await pool.query(`
                SELECT * FROM user_progress 
                WHERE user_id = $1
                ORDER BY started_at DESC
            `, [userId]);
            
            return result.rows.map(row => {
                const progress = new Progress(row);
                if (typeof progress.answers === 'string') {
                    progress.answers = JSON.parse(progress.answers);
                }
                return progress;
            });
        } catch (error) {
            throw new Error(`Ошибка получения прогресса пользователя: ${error.message}`);
        }
    }

    // Получение завершенных билетов пользователя
    static async getCompletedTickets(userId) {
        try {
            const result = await pool.query(`
                SELECT ticket_id, score, total_questions, completed_at
                FROM user_progress 
                WHERE user_id = $1 AND completed = true
                ORDER BY completed_at DESC
            `, [userId]);
            
            return result.rows;
        } catch (error) {
            throw new Error(`Ошибка получения завершенных билетов: ${error.message}`);
        }
    }

    // Сохранение ответа пользователя на вопрос
    static async saveAnswer(userId, questionId, userAnswer, isCorrect, timeSpent = 0) {
        try {
            await pool.query(`
                INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, time_spent)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, questionId, userAnswer, isCorrect, timeSpent]);
            
            // Обновляем статистику вопроса
            await pool.query(`
                UPDATE question_statistics 
                SET 
                    total_attempts = total_attempts + 1,
                    correct_attempts = correct_attempts + $1,
                    incorrect_attempts = incorrect_attempts + $2
                WHERE question_id = $3
            `, [isCorrect ? 1 : 0, isCorrect ? 0 : 1, questionId]);
            
            // Если ответ неправильный, обновляем статистику ошибок
            if (!isCorrect) {
                await pool.query(`
                    INSERT INTO user_mistake_stats (user_id, question_id, mistake_count, last_mistake_at)
                    VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, question_id) 
                    DO UPDATE SET 
                        mistake_count = user_mistake_stats.mistake_count + 1,
                        last_mistake_at = CURRENT_TIMESTAMP
                `, [userId, questionId]);
            }
            
            return true;
        } catch (error) {
            throw new Error(`Ошибка сохранения ответа: ${error.message}`);
        }
    }

    // Сохранение попытки прохождения билета
    static async saveAttempt(userId, ticketId, score, totalQuestions, timeSpent = 0) {
        try {
            await pool.query(`
                INSERT INTO ticket_attempts (user_id, ticket_id, score, total_questions, time_spent)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, ticketId, score, totalQuestions, timeSpent]);
            
            return true;
        } catch (error) {
            throw new Error(`Ошибка сохранения попытки: ${error.message}`);
        }
    }

    // Получение истории попыток
    static async getAttempts(userId, limit = 10) {
        try {
            const result = await pool.query(`
                SELECT * FROM ticket_attempts
                WHERE user_id = $1
                ORDER BY completed_at DESC
                LIMIT $2
            `, [userId, limit]);
            
            return result.rows;
        } catch (error) {
            throw new Error(`Ошибка получения истории попыток: ${error.message}`);
        }
    }

    // Получение вопросов, на которых пользователь ошибался
    static async getMistakes(userId, limit = 20) {
        try {
            const result = await pool.query(`
                SELECT 
                    ums.question_id,
                    ums.mistake_count,
                    ums.last_mistake_at
                FROM user_mistake_stats ums
                WHERE ums.user_id = $1
                ORDER BY ums.mistake_count DESC, ums.last_mistake_at DESC
                LIMIT $2
            `, [userId, limit]);
            
            return result.rows;
        } catch (error) {
            throw new Error(`Ошибка получения ошибок: ${error.message}`);
        }
    }

    // Удаление прогресса пользователя
    static async deleteByUser(userId) {
        try {
            await pool.query('DELETE FROM user_progress WHERE user_id = $1', [userId]);
            return true;
        } catch (error) {
            throw new Error(`Ошибка удаления прогресса: ${error.message}`);
        }
    }

    // Получение статистики пользователя
    static async getUserStats(userId) {
        try {
            const progressStats = await pool.query(`
                SELECT 
                    COUNT(DISTINCT ticket_id) as tickets_attempted,
                    COUNT(CASE WHEN completed = true THEN 1 END) as tickets_completed,
                    AVG(CASE WHEN completed = true THEN score::float / total_questions END) * 100 as average_percentage,
                    SUM(score) as total_correct_answers
                FROM user_progress
                WHERE user_id = $1
            `, [userId]);
            
            const answersStats = await pool.query(`
                SELECT 
                    COUNT(*) as total_answers,
                    COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_answers,
                    COUNT(CASE WHEN is_correct = false THEN 1 END) as incorrect_answers,
                    AVG(time_spent) as average_time_per_question
                FROM user_answers
                WHERE user_id = $1
            `, [userId]);
            
            const mistakeCount = await pool.query(`
                SELECT COUNT(*) as mistake_questions
                FROM user_mistake_stats
                WHERE user_id = $1
            `, [userId]);
            
            return {
                ...progressStats.rows[0],
                ...answersStats.rows[0],
                ...mistakeCount.rows[0]
            };
        } catch (error) {
            throw new Error(`Ошибка получения статистики: ${error.message}`);
        }
    }
}

module.exports = Progress;
