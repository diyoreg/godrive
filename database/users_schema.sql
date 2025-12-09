-- GoDrive PostgreSQL Users Schema
-- Схема пользователей для PostgreSQL (в той же БД что и вопросы)

-- ==================================================
-- ТАБЛИЦЫ ПОЛЬЗОВАТЕЛЕЙ
-- ==================================================

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица прогресса пользователей по билетам
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 10,
    answers JSONB, -- JSON с ответами
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, ticket_id)
);

-- Таблица настроек пользователей
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'ru' CHECK (language IN ('ru', 'uz', 'uzk')),
    notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сессий пользователей (для JWT токенов)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица попыток прохождения билетов (детальная статистика)
CREATE TABLE IF NOT EXISTS ticket_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER DEFAULT 10,
    time_spent INTEGER, -- секунды
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица ответов пользователей на вопросы
CREATE TABLE IF NOT EXISTS user_answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    user_answer INTEGER NOT NULL CHECK (user_answer >= 1 AND user_answer <= 5),
    is_correct BOOLEAN NOT NULL,
    time_spent INTEGER, -- секунды на ответ
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица ошибок пользователей (для обучения на ошибках)
CREATE TABLE IF NOT EXISTS user_mistake_stats (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    mistake_count INTEGER DEFAULT 0,
    last_mistake_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, question_id)
);

-- Таблица платежей (опционально, для будущего)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'UZS',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ==================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==================================================

-- Индексы для пользователей
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Индексы для прогресса
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_ticket_id ON user_progress(ticket_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);

-- Индексы для сессий
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Индексы для попыток
CREATE INDEX idx_ticket_attempts_user_id ON ticket_attempts(user_id);
CREATE INDEX idx_ticket_attempts_ticket_id ON ticket_attempts(ticket_id);
CREATE INDEX idx_ticket_attempts_completed ON ticket_attempts(completed_at);

-- Индексы для ответов
CREATE INDEX idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX idx_user_answers_correct ON user_answers(is_correct);

-- Индексы для ошибок
CREATE INDEX idx_user_mistake_stats_user_id ON user_mistake_stats(user_id);
CREATE INDEX idx_user_mistake_stats_question_id ON user_mistake_stats(question_id);

-- Индексы для платежей
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

-- ==================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЗАЦИИ
-- ==================================================

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автообновления updated_at
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_timestamp
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ==================================================

COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON TABLE user_progress IS 'Прогресс пользователей по билетам';
COMMENT ON TABLE user_settings IS 'Настройки пользователей';
COMMENT ON TABLE user_sessions IS 'Активные сессии пользователей';
COMMENT ON TABLE ticket_attempts IS 'Попытки прохождения билетов';
COMMENT ON TABLE user_answers IS 'Ответы пользователей на вопросы';
COMMENT ON TABLE user_mistake_stats IS 'Статистика ошибок для обучения';
COMMENT ON TABLE payments IS 'История платежей';

COMMENT ON COLUMN users.role IS 'Роль: user или admin';
COMMENT ON COLUMN user_progress.answers IS 'JSONB с детальными ответами';
COMMENT ON COLUMN user_answers.is_correct IS 'Правильность ответа';
COMMENT ON COLUMN payments.status IS 'Статус платежа: pending, completed, failed, refunded';
