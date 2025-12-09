const db = require('../database/connection');

class Progress {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.ticket_id = data.ticket_id;
        this.completed = data.completed || false;
        this.score = data.score || 0;
        this.total_questions = data.total_questions || 10;
        this.answers = data.answers ? JSON.parse(data.answers) : {};
        this.started_at = data.started_at;
        this.completed_at = data.completed_at;
    }

    // Сохранение прогресса по билету
    static async saveProgress(userId, ticketId, progressData) {
        try {
            const { completed = false, score = 0, answers = {}, totalQuestions = 10 } = progressData;
            
            const answersJson = JSON.stringify(answers);
            const completedAt = completed ? new Date().toISOString() : null;
            
            const result = await db.run(`
                INSERT OR REPLACE INTO user_progress 
                (user_id, ticket_id, completed, score, total_questions, answers, completed_at, started_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(
                    (SELECT started_at FROM user_progress WHERE user_id = ? AND ticket_id = ?),
                    CURRENT_TIMESTAMP
                ))
            `, [
                userId, ticketId, completed ? 1 : 0, score, totalQuestions, 
                answersJson, completedAt, userId, ticketId
            ]);
            
            return await Progress.getByUserAndTicket(userId, ticketId);
        } catch (error) {
            throw new Error(`Ошибка сохранения прогресса: ${error.message}`);
        }
    }

    // Получение прогресса пользователя по конкретному билету
    static async getByUserAndTicket(userId, ticketId) {
        try {
            const row = await db.get(`
                SELECT * FROM user_progress 
                WHERE user_id = ? AND ticket_id = ?
            `, [userId, ticketId]);
            
            return row ? new Progress(row) : null;
        } catch (error) {
            throw new Error(`Ошибка получения прогресса: ${error.message}`);
        }
    }

    // Получение всего прогресса пользователя
    static async getByUser(userId) {
        try {
            const rows = await db.all(`
                SELECT * FROM user_progress 
                WHERE user_id = ? 
                ORDER BY ticket_id
            `, [userId]);
            
            return rows.map(row => new Progress(row));
        } catch (error) {
            throw new Error(`Ошибка получения прогресса пользователя: ${error.message}`);
        }
    }

    // Получение завершенных билетов пользователя
    static async getCompletedTickets(userId) {
        try {
            const rows = await db.all(`
                SELECT ticket_id, score, total_questions, completed_at
                FROM user_progress 
                WHERE user_id = ? AND completed = 1
                ORDER BY ticket_id
            `, [userId]);
            
            return rows.map(row => ({
                ticketId: row.ticket_id,
                score: row.score,
                totalQuestions: row.total_questions,
                percentage: Math.round((row.score / row.total_questions) * 100),
                completedAt: row.completed_at
            }));
        } catch (error) {
            throw new Error(`Ошибка получения завершенных билетов: ${error.message}`);
        }
    }

    // Получение статистики пользователя
    static async getUserStats(userId) {
        try {
            const stats = await db.get(`
                SELECT 
                    COUNT(*) as testsCompleted,
                    AVG(CAST(score AS FLOAT) / total_questions * 100) as averageScore,
                    MAX(CAST(score AS FLOAT) / total_questions * 100) as bestScore,
                    MIN(CAST(score AS FLOAT) / total_questions * 100) as worstScore,
                    SUM(score) as totalCorrectAnswers,
                    SUM(total_questions) as totalQuestions
                FROM user_progress 
                WHERE user_id = ? AND completed = 1
            `, [userId]);
            
            return {
                testsCompleted: stats.testsCompleted || 0,
                averageScore: Math.round(stats.averageScore || 0),
                bestScore: Math.round(stats.bestScore || 0),
                worstScore: Math.round(stats.worstScore || 0),
                totalCorrectAnswers: stats.totalCorrectAnswers || 0,
                totalQuestions: stats.totalQuestions || 0
            };
        } catch (error) {
            throw new Error(`Ошибка получения статистики: ${error.message}`);
        }
    }

    // Проверка, завершен ли билет
    static async isTicketCompleted(userId, ticketId) {
        try {
            const row = await db.get(`
                SELECT completed FROM user_progress 
                WHERE user_id = ? AND ticket_id = ? AND completed = 1
            `, [userId, ticketId]);
            
            return !!row;
        } catch (error) {
            throw new Error(`Ошибка проверки завершенности билета: ${error.message}`);
        }
    }

    // Получение списка всех начатых, но не завершенных билетов
    static async getInProgressTickets(userId) {
        try {
            const rows = await db.all(`
                SELECT ticket_id, score, total_questions, started_at
                FROM user_progress 
                WHERE user_id = ? AND completed = 0
                ORDER BY started_at DESC
            `, [userId]);
            
            return rows.map(row => ({
                ticketId: row.ticket_id,
                score: row.score,
                totalQuestions: row.total_questions,
                startedAt: row.started_at
            }));
        } catch (error) {
            throw new Error(`Ошибка получения незавершенных билетов: ${error.message}`);
        }
    }

    // Удаление прогресса по конкретному билету
    static async deleteTicketProgress(userId, ticketId) {
        try {
            const result = await db.run(`
                DELETE FROM user_progress 
                WHERE user_id = ? AND ticket_id = ?
            `, [userId, ticketId]);
            
            return result.changes > 0;
        } catch (error) {
            throw new Error(`Ошибка удаления прогресса билета: ${error.message}`);
        }
    }

    // Очистка всего прогресса пользователя
    static async clearAllProgress(userId) {
        try {
            const result = await db.run(`
                DELETE FROM user_progress WHERE user_id = ?
            `, [userId]);
            
            return result.changes;
        } catch (error) {
            throw new Error(`Ошибка очистки прогресса: ${error.message}`);
        }
    }

    // Преобразование в объект
    toObject() {
        return {
            id: this.id,
            userId: this.user_id,
            ticketId: this.ticket_id,
            completed: this.completed,
            score: this.score,
            totalQuestions: this.total_questions,
            answers: this.answers,
            percentage: Math.round((this.score / this.total_questions) * 100),
            startedAt: this.started_at,
            completedAt: this.completed_at
        };
    }
}

module.exports = Progress;