const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// URL вашего Cloudflare R2
const R2_BASE_URL = 'https://pub-eb6a742d1f3d48568bcc6d3c14150eaf.r2.dev';

// Подключение к PostgreSQL
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'questions',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'your_password',
    max: 20, // максимум 20 соединений в пуле
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function importQuestions() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Начинаем импорт вопросов в PostgreSQL...');
        
        // Начинаем транзакцию
        await client.query('BEGIN');
        
        // Читаем JSON файл
        const questionsPath = path.join(__dirname, '..', 'data', 'questions.json');
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        
        console.log(`📊 Найдено вопросов: ${questionsData.length}`);
        
        let imported = 0;
        let errors = 0;
        
        // Импортируем каждый вопрос
        for (const question of questionsData) {
            try {
                const { questionId, image, correctAnswer, translations } = question;
                
                // Формируем URL изображения
                const imageUrl = image 
                    ? `${R2_BASE_URL}/${image}`
                    : `${R2_BASE_URL}/defaultpic.webp`;
                
                // 1. Вставляем основную запись вопроса
                const questionResult = await client.query(
                    `INSERT INTO questions (question_id, image_url, correct_answer, difficulty_level)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (question_id) DO UPDATE 
                     SET image_url = $2, correct_answer = $3, updated_at = CURRENT_TIMESTAMP
                     RETURNING id`,
                    [questionId, imageUrl, correctAnswer, 1] // difficulty_level = 1 по умолчанию
                );
                
                // 2. Вставляем переводы для каждого языка
                for (const [lang, translation] of Object.entries(translations)) {
                    const { text, explanation } = translation;
                    
                    await client.query(
                        `INSERT INTO question_translations (question_id, language, question_text, explanation)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (question_id, language) DO UPDATE 
                         SET question_text = $3, explanation = $4`,
                        [questionId, lang, text, explanation]
                    );
                    
                    // 3. Вставляем варианты ответов
                    const options = translation.options || [];
                    for (let i = 0; i < options.length; i++) {
                        await client.query(
                            `INSERT INTO question_options (question_id, language, option_number, option_text)
                             VALUES ($1, $2, $3, $4)
                             ON CONFLICT (question_id, language, option_number) DO UPDATE 
                             SET option_text = $4`,
                            [questionId, lang, i + 1, options[i]]
                        );
                    }
                }
                
                // 4. Инициализируем статистику
                await client.query(
                    `INSERT INTO question_statistics (question_id, total_attempts, correct_attempts, incorrect_attempts)
                     VALUES ($1, 0, 0, 0)
                     ON CONFLICT (question_id) DO NOTHING`,
                    [questionId]
                );
                
                imported++;
                
                // Прогресс каждые 50 вопросов
                if (imported % 50 === 0) {
                    console.log(`✅ Импортировано: ${imported} / ${questionsData.length}`);
                }
                
            } catch (err) {
                errors++;
                console.error(`❌ Ошибка при импорте вопроса ${question.questionId}:`, err.message);
            }
        }
        
        // Коммитим транзакцию
        await client.query('COMMIT');
        
        console.log('\n✅ Импорт завершен!');
        console.log(`📈 Успешно импортировано: ${imported}`);
        console.log(`❌ Ошибок: ${errors}`);
        
        // Статистика
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_questions,
                COUNT(DISTINCT question_id) as unique_questions,
                (SELECT COUNT(*) FROM question_translations) as total_translations,
                (SELECT COUNT(*) FROM question_options) as total_options
            FROM questions
        `);
        
        console.log('\n📊 Статистика базы данных:');
        console.log(`   Всего вопросов: ${stats.rows[0].total_questions}`);
        console.log(`   Уникальных вопросов: ${stats.rows[0].unique_questions}`);
        console.log(`   Переводов: ${stats.rows[0].total_translations}`);
        console.log(`   Вариантов ответов: ${stats.rows[0].total_options}`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('💥 Критическая ошибка:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Запускаем импорт
importQuestions()
    .then(() => {
        console.log('\n✨ Процесс импорта завершен успешно!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Импорт завершился с ошибкой:', err);
        process.exit(1);
    });
