-- GoDrive Questions Database Schema (PostgreSQL)
-- Оптимизировано для 70,000-100,000 пользователей
-- Создание отдельной базы данных: questions

-- ==================================================
-- ОСНОВНЫЕ ТАБЛИЦЫ ВОПРОСОВ
-- ==================================================

-- Таблица вопросов (основная информация)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER UNIQUE NOT NULL, -- ID из JSON (1-1130)
    image_url VARCHAR(255), -- URL изображения в R2
    correct_answer SMALLINT NOT NULL CHECK (correct_answer >= 1 AND correct_answer <= 5),
    difficulty_level SMALLINT DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    category VARCHAR(100), -- категория вопроса (знаки, правила и т.д.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица переводов вопросов (нормализованная структура)
CREATE TABLE IF NOT EXISTS question_translations (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    language VARCHAR(5) NOT NULL CHECK (language IN ('uz', 'ru', 'uzk')),
    question_text TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, language)
);

-- Таблица вариантов ответов
CREATE TABLE IF NOT EXISTS question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    language VARCHAR(5) NOT NULL CHECK (language IN ('uz', 'ru', 'uzk')),
    option_number SMALLINT NOT NULL CHECK (option_number >= 1 AND option_number <= 5),
    option_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, language, option_number)
);

-- ==================================================
-- СТАТИСТИКА И АНАЛИТИКА (для оптимизации)
-- ==================================================

-- Глобальная статистика по вопросам
CREATE TABLE IF NOT EXISTS question_statistics (
    question_id INTEGER PRIMARY KEY REFERENCES questions(question_id) ON DELETE CASCADE,
    total_attempts BIGINT DEFAULT 0,
    correct_attempts BIGINT DEFAULT 0,
    incorrect_attempts BIGINT DEFAULT 0,
    average_time_seconds INTEGER DEFAULT 0,
    difficulty_score DECIMAL(5,2) DEFAULT 0, -- автоматически рассчитываемая сложность
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==================================================

-- Основные индексы для вопросов
CREATE INDEX idx_questions_question_id ON questions(question_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_category ON questions(category);

-- Индексы для переводов (частые JOIN)
CREATE INDEX idx_translations_question_lang ON question_translations(question_id, language);
CREATE INDEX idx_translations_language ON question_translations(language);

-- Индексы для вариантов ответов
CREATE INDEX idx_options_question_lang ON question_options(question_id, language);
CREATE INDEX idx_options_language ON question_options(language);

-- Индекс для статистики
CREATE INDEX idx_statistics_difficulty ON question_statistics(difficulty_score);

-- ==================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЗАЦИИ
-- ==================================================

-- Функция обновления timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
CREATE TRIGGER update_questions_timestamp
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического расчета сложности вопроса
CREATE OR REPLACE FUNCTION calculate_difficulty_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_attempts > 0 THEN
        NEW.difficulty_score = ROUND(
            (NEW.incorrect_attempts::DECIMAL / NEW.total_attempts) * 5, 
            2
        );
    END IF;
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для расчета сложности
CREATE TRIGGER calculate_question_difficulty
    BEFORE UPDATE ON question_statistics
    FOR EACH ROW
    WHEN (NEW.total_attempts IS DISTINCT FROM OLD.total_attempts)
    EXECUTE FUNCTION calculate_difficulty_score();

-- ==================================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ УДОБНЫХ ЗАПРОСОВ
-- ==================================================

-- Представление: Полная информация о вопросе на русском
CREATE OR REPLACE VIEW questions_ru AS
SELECT 
    q.id,
    q.question_id,
    q.image_url,
    q.correct_answer,
    q.difficulty_level,
    q.category,
    qt.question_text,
    qt.explanation,
    ARRAY_AGG(qo.option_text ORDER BY qo.option_number) as options,
    qs.total_attempts,
    qs.correct_attempts,
    qs.difficulty_score
FROM questions q
LEFT JOIN question_translations qt ON q.question_id = qt.question_id AND qt.language = 'ru'
LEFT JOIN question_options qo ON q.question_id = qo.question_id AND qo.language = 'ru'
LEFT JOIN question_statistics qs ON q.question_id = qs.question_id
GROUP BY q.id, q.question_id, q.image_url, q.correct_answer, q.difficulty_level, 
         q.category, qt.question_text, qt.explanation, qs.total_attempts, 
         qs.correct_attempts, qs.difficulty_score;

-- Представление: Полная информация о вопросе на узбекском
CREATE OR REPLACE VIEW questions_uz AS
SELECT 
    q.id,
    q.question_id,
    q.image_url,
    q.correct_answer,
    q.difficulty_level,
    q.category,
    qt.question_text,
    qt.explanation,
    ARRAY_AGG(qo.option_text ORDER BY qo.option_number) as options,
    qs.total_attempts,
    qs.correct_attempts,
    qs.difficulty_score
FROM questions q
LEFT JOIN question_translations qt ON q.question_id = qt.question_id AND qt.language = 'uz'
LEFT JOIN question_options qo ON q.question_id = qo.question_id AND qo.language = 'uz'
LEFT JOIN question_statistics qs ON q.question_id = qs.question_id
GROUP BY q.id, q.question_id, q.image_url, q.correct_answer, q.difficulty_level, 
         q.category, qt.question_text, qt.explanation, qs.total_attempts, 
         qs.correct_attempts, qs.difficulty_score;

-- Представление: Полная информация о вопросе на узбекском (кириллица)
CREATE OR REPLACE VIEW questions_uzk AS
SELECT 
    q.id,
    q.question_id,
    q.image_url,
    q.correct_answer,
    q.difficulty_level,
    q.category,
    qt.question_text,
    qt.explanation,
    ARRAY_AGG(qo.option_text ORDER BY qo.option_number) as options,
    qs.total_attempts,
    qs.correct_attempts,
    qs.difficulty_score
FROM questions q
LEFT JOIN question_translations qt ON q.question_id = qt.question_id AND qt.language = 'uzk'
LEFT JOIN question_options qo ON q.question_id = qo.question_id AND qo.language = 'uzk'
LEFT JOIN question_statistics qs ON q.question_id = qs.question_id
GROUP BY q.id, q.question_id, q.image_url, q.correct_answer, q.difficulty_level, 
         q.category, qt.question_text, qt.explanation, qs.total_attempts, 
         qs.correct_attempts, qs.difficulty_score;

-- ==================================================
-- ПАРТИЦИОНИРОВАНИЕ (для масштабирования)
-- ==================================================

-- Партиционирование статистики по месяцам (опционально, для будущего)
-- Если будет храниться детальная статистика по времени

-- ==================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ==================================================

COMMENT ON TABLE questions IS 'Основная таблица вопросов с метаданными';
COMMENT ON TABLE question_translations IS 'Переводы вопросов на 3 языка';
COMMENT ON TABLE question_options IS 'Варианты ответов для каждого вопроса';
COMMENT ON TABLE question_statistics IS 'Глобальная статистика по каждому вопросу';

COMMENT ON COLUMN questions.question_id IS 'Оригинальный ID из JSON (1-1130)';
COMMENT ON COLUMN questions.image_url IS 'URL изображения в Cloudflare R2';
COMMENT ON COLUMN questions.correct_answer IS 'Номер правильного ответа (1-5)';
COMMENT ON COLUMN questions.difficulty_level IS 'Уровень сложности (1-5)';
COMMENT ON COLUMN question_statistics.difficulty_score IS 'Автоматически рассчитываемая сложность на основе ответов пользователей';
