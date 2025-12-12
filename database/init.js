const bcrypt = require('bcryptjs');
const pool = require('./connection');
const fs = require('fs').promises;
const path = require('path');

// Дефолтная картинка для вопросов без изображения
const DEFAULT_IMAGE_URL = 'https://pub-eb6a742d1f3d48568bcc6d3c14150eaf.r2.dev/defaultpic.webp';

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
            
            // Импортируем вопросы если их нет
            await this.importQuestionsIfNeeded();
            
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
        console.log('📝 Создание таблиц...');
        
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

            -- Таблица статистики пользователей
            CREATE TABLE IF NOT EXISTS user_statistics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                time_spent_seconds INTEGER DEFAULT 0,
                total_questions_answered INTEGER DEFAULT 0,
                correct_answers INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );

            -- Таблица ответов пользователей
            CREATE TABLE IF NOT EXISTS user_answers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                user_answer INTEGER NOT NULL,
                is_correct BOOLEAN NOT NULL,
                time_spent INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );

            -- Таблица статистики ошибок пользователей
            CREATE TABLE IF NOT EXISTS user_mistake_stats (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                mistake_count INTEGER DEFAULT 0,
                last_mistake_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, question_id)
            );

            -- Таблицы вопросов на трёх языках
            CREATE TABLE IF NOT EXISTS questions_uz (
                question_id INTEGER PRIMARY KEY,
                question_text TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_answer INTEGER NOT NULL,
                explanation TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS questions_ru (
                question_id INTEGER PRIMARY KEY,
                question_text TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_answer INTEGER NOT NULL,
                explanation TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS questions_uzk (
                question_id INTEGER PRIMARY KEY,
                question_text TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_answer INTEGER NOT NULL,
                explanation TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Индексы для оптимизации
            CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_progress_ticket_id ON user_progress(ticket_id);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
            CREATE INDEX IF NOT EXISTS idx_user_mistake_stats_user_id ON user_mistake_stats(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_mistake_stats_question_id ON user_mistake_stats(question_id);
            CREATE INDEX IF NOT EXISTS idx_questions_uz_id ON questions_uz(question_id);
            CREATE INDEX IF NOT EXISTS idx_questions_ru_id ON questions_ru(question_id);
            CREATE INDEX IF NOT EXISTS idx_questions_uzk_id ON questions_uzk(question_id);
        `;

        await this.pool.query(schema);
        console.log('✅ Все таблицы созданы');
    }

    async importQuestionsIfNeeded() {
        try {
            console.log('📚 Проверка наличия вопросов...');
            
            // Проверяем есть ли вопросы
            const result = await this.pool.query('SELECT COUNT(*) FROM questions_uz');
            const count = parseInt(result.rows[0].count);
            
            if (count > 0) {
                console.log(`✅ Вопросы уже загружены (${count} шт.)`);
                return;
            }
            
            console.log('📥 Импорт вопросов из data/questions.json...');
            
            // Читаем файл с вопросами
            const questionsFile = path.join(__dirname, '..', 'data', 'questions.json');
            const questionsData = await fs.readFile(questionsFile, 'utf8');
            const allQuestions = JSON.parse(questionsData);
            
            // Импортируем для каждого языка
            for (const lang of ['uz', 'ru', 'uzk']) {
                let importedCount = 0;
                
                for (const question of allQuestions) {
                    const questionId = question.questionId;
                    const translation = question.translations[lang];
                    
                    if (!translation) {
                        continue;
                    }
                    
                    const questionText = translation.text;
                    const options = translation.options;
                    const correctAnswer = question.correctAnswer;
                    const explanation = translation.explanation || '';
                    
                    // Если картинки нет - используем дефолтную из R2
                    const imageUrl = question.image 
                        ? `https://pub-eb6a742d1f3d48568bcc6d3c14150eaf.r2.dev/${question.image}`
                        : DEFAULT_IMAGE_URL;
                    
                    const insertQuery = `
                        INSERT INTO questions_${lang} (
                            question_id, question_text, options, correct_answer, explanation, image_url
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (question_id) DO UPDATE SET
                            question_text = EXCLUDED.question_text,
                            options = EXCLUDED.options,
                            correct_answer = EXCLUDED.correct_answer,
                            explanation = EXCLUDED.explanation,
                            image_url = EXCLUDED.image_url
                    `;
                    
                    await this.pool.query(insertQuery, [
                        questionId,
                        questionText,
                        JSON.stringify(options),
                        correctAnswer,
                        explanation,
                        imageUrl
                    ]);
                    
                    importedCount++;
                }
                
                console.log(`  ✅ ${lang}: ${importedCount} вопросов`);
            }
            
            console.log('✅ Все вопросы импортированы');
            
        } catch (error) {
            console.error('❌ Ошибка импорта вопросов:', error.message);
            // Не прерываем инициализацию если вопросы не импортировались
        }
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