const express = require('express');
const router = express.Router();
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

// Middleware для проверки подключения к БД
router.use(async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(503).json({ 
            error: 'Database unavailable',
            message: 'Не удалось подключиться к базе данных вопросов'
        });
    }
});

/**
 * GET /api/questions/batch
 * Получить несколько вопросов по списку ID
 * Query params: ids (comma-separated), lang (uz|ru|uzk)
 */
router.get('/batch', async (req, res) => {
    try {
        const ids = req.query.ids ? req.query.ids.split(',').map(Number) : [];
        const lang = req.query.lang || 'uz';

        if (ids.length === 0) {
            return res.status(400).json({ 
                error: 'Missing IDs',
                message: 'Необходимо указать ID вопросов через параметр ids'
            });
        }

        if (!['uz', 'ru', 'uzk'].includes(lang)) {
            return res.status(400).json({ 
                error: 'Invalid language',
                message: 'Язык должен быть: uz, ru или uzk'
            });
        }

        const result = await pool.query(`
            SELECT * FROM questions_${lang}
            WHERE question_id = ANY($1::int[])
            ORDER BY question_id
        `, [ids]);

        res.json({
            questions: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching batch questions:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Ошибка при получении списка вопросов'
        });
    }
});

/**
 * GET /api/questions/:id
 * Получить вопрос по ID с переводами на всех языках
 */
router.get('/:id', async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        
        if (isNaN(questionId) || questionId < 1 || questionId > 1130) {
            return res.status(400).json({ 
                error: 'Invalid question ID',
                message: 'ID вопроса должен быть числом от 1 до 1130'
            });
        }

        const result = await pool.query(`
            SELECT 
                q.question_id,
                q.image_url,
                q.correct_answer,
                q.difficulty_level,
                q.category,
                json_object_agg(
                    qt.language,
                    json_build_object(
                        'text', qt.question_text,
                        'explanation', qt.explanation,
                        'options', (
                            SELECT array_agg(qo.option_text ORDER BY qo.option_number)
                            FROM question_options qo
                            WHERE qo.question_id = q.question_id 
                            AND qo.language = qt.language
                        )
                    )
                ) as translations
            FROM questions q
            LEFT JOIN question_translations qt ON q.question_id = qt.question_id
            WHERE q.question_id = $1
            GROUP BY q.id, q.question_id, q.image_url, q.correct_answer, 
                     q.difficulty_level, q.category
        `, [questionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Question not found',
                message: `Вопрос с ID ${questionId} не найден`
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Ошибка при получении вопроса'
        });
    }
});

/**
 * GET /api/questions/lang/:lang
 * Получить все вопросы на конкретном языке
 * Query params: limit, offset для пагинации
 */
router.get('/lang/:lang', async (req, res) => {
    try {
        const { lang } = req.params;
        const limit = parseInt(req.query.limit) || 1130;
        const offset = parseInt(req.query.offset) || 0;

        if (!['uz', 'ru', 'uzk'].includes(lang)) {
            return res.status(400).json({ 
                error: 'Invalid language',
                message: 'Язык должен быть: uz, ru или uzk'
            });
        }

        const result = await pool.query(`
            SELECT * FROM questions_${lang}
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        res.json({
            questions: result.rows,
            total: result.rows.length,
            limit,
            offset
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Ошибка при получении вопросов'
        });
    }
});

/**
 * GET /api/questions/random/:count
 * Получить случайные вопросы для билета
 * Query params: lang (uz|ru|uzk), exclude (массив ID для исключения)
 */
router.get('/random/:count', async (req, res) => {
    try {
        const count = parseInt(req.params.count);
        const lang = req.query.lang || 'uz';
        const exclude = req.query.exclude ? req.query.exclude.split(',').map(Number) : [];

        if (isNaN(count) || count < 1 || count > 1130) {
            return res.status(400).json({ 
                error: 'Invalid count',
                message: 'Количество вопросов должно быть от 1 до 1130'
            });
        }

        if (!['uz', 'ru', 'uzk'].includes(lang)) {
            return res.status(400).json({ 
                error: 'Invalid language',
                message: 'Язык должен быть: uz, ru или uzk'
            });
        }

        let query = `
            SELECT * FROM questions_${lang}
            WHERE question_id NOT IN (${exclude.length > 0 ? exclude.join(',') : '0'})
            ORDER BY RANDOM()
            LIMIT $1
        `;

        const result = await pool.query(query, [count]);

        res.json({
            questions: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching random questions:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Ошибка при получении случайных вопросов'
        });
    }
});

/**
 * POST /api/questions/stats/:id
 * Обновить статистику вопроса после ответа
 * Body: { correct: boolean, timeSeconds: number }
 */
router.post('/stats/:id', async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { correct, timeSeconds } = req.body;

        if (isNaN(questionId) || questionId < 1 || questionId > 1130) {
            return res.status(400).json({ 
                error: 'Invalid question ID',
                message: 'ID вопроса должен быть числом от 1 до 1130'
            });
        }

        if (typeof correct !== 'boolean') {
            return res.status(400).json({ 
                error: 'Invalid data',
                message: 'Параметр correct должен быть boolean'
            });
        }

        await pool.query(`
            INSERT INTO question_statistics (question_id, total_attempts, correct_attempts, incorrect_attempts, average_time_seconds)
            VALUES ($1, 1, $2, $3, $4)
            ON CONFLICT (question_id) DO UPDATE SET
                total_attempts = question_statistics.total_attempts + 1,
                correct_attempts = question_statistics.correct_attempts + $2,
                incorrect_attempts = question_statistics.incorrect_attempts + $3,
                average_time_seconds = (
                    question_statistics.average_time_seconds * question_statistics.total_attempts + $4
                ) / (question_statistics.total_attempts + 1),
                last_updated = CURRENT_TIMESTAMP
        `, [questionId, correct ? 1 : 0, correct ? 0 : 1, timeSeconds || 0]);

        res.json({ success: true, message: 'Статистика обновлена' });
    } catch (error) {
        console.error('Error updating question stats:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Ошибка при обновлении статистики'
        });
    }
});

/**
 * GET /api/questions/stats/difficult
 * Получить самые сложные вопросы
 * Query params: limit (default 20), lang (uz|ru|uzk)
 */
router.get('/stats/difficult', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const lang = req.query.lang || 'uz';

        if (!['uz', 'ru', 'uzk'].includes(lang)) {
            return res.status(400).json({ 
                error: 'Invalid language',
                message: 'Язык должен быть: uz, ru или uzk'
            });
        }

        const result = await pool.query(`
            SELECT 
                q.*,
                qs.difficulty_score,
                qs.total_attempts,
                qs.correct_attempts,
                qs.incorrect_attempts
            FROM questions_${lang} q
            JOIN question_statistics qs ON q.question_id = qs.question_id
            WHERE qs.total_attempts > 10
            ORDER BY qs.difficulty_score DESC
            LIMIT $1
        `, [limit]);

        res.json({
            questions: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching difficult questions:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Ошибка при получении сложных вопросов'
        });
    }
});

module.exports = router;
