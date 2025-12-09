// Модуль для загрузки билетов и вопросов из PostgreSQL через API
class TicketLoader {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api/questions';
        this.cache = new Map();
        this.totalQuestions = 1130; // Известное количество вопросов в БД
        this.questionsPerTicket = 10; // Стандартное количество вопросов в билете
    }

    // Загружает вопрос по ID из API
    async loadQuestion(questionId, language = null) {
        // Используем язык из параметра или из localStorage
        const currentLang = language || localStorage.getItem('selectedLanguage') || 'uz';
        const cacheKey = `question_${questionId}_${currentLang}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/${questionId}`);
            
            if (!response.ok) {
                throw new Error(`Question ${questionId} not found`);
            }
            
            const questionData = await response.json();
            
            // Возвращаем вопрос в формате с переводами
            this.cache.set(cacheKey, questionData);
            return questionData;
        } catch (error) {
            console.error(`Error loading question ${questionId}:`, error);
            return null;
        }
    }

    // Получает данные вопроса на конкретном языке
    getQuestionData(question, language = null) {
        const lang = language || localStorage.getItem('selectedLanguage') || 'uz';
        
        if (question.translations && question.translations[lang]) {
            return question.translations[lang];
        }
        
        // Fallback на узбекский если запрошенный язык недоступен
        if (question.translations && question.translations['uz']) {
            return question.translations['uz'];
        }
        
        // Fallback на первый доступный язык
        if (question.translations) {
            const firstLang = Object.keys(question.translations)[0];
            return question.translations[firstLang];
        }
        
        return null;
    }

    // Генерирует билет по номеру (детерминированный выбор вопросов)
    async loadTicket(ticketNumber) {
        const cacheKey = `ticket_${ticketNumber}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const currentLang = localStorage.getItem('selectedLanguage') || 'uz';
            
            // Генерируем детерминированный список ID вопросов для билета
            // Каждый билет получает уникальный набор из 10 вопросов
            const questionIds = this.generateTicketQuestionIds(ticketNumber);
            
            // Загружаем вопросы через batch API
            const response = await fetch(`${this.apiBaseUrl}/batch?ids=${questionIds.join(',')}&lang=${currentLang}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load ticket ${ticketNumber}`);
            }
            
            const data = await response.json();
            
            const ticket = {
                ticketNumber: ticketNumber,
                questions: data.questions
            };
            
            this.cache.set(cacheKey, ticket);
            return ticket;
        } catch (error) {
            console.error(`Error loading ticket ${ticketNumber}:`, error);
            return null;
        }
    }

    // Генерирует детерминированный список ID вопросов для билета
    // Билет N всегда будет содержать одни и те же вопросы
    generateTicketQuestionIds(ticketNumber) {
        const questionIds = [];
        const startId = ((ticketNumber - 1) * this.questionsPerTicket) % this.totalQuestions;
        
        for (let i = 0; i < this.questionsPerTicket; i++) {
            const questionId = ((startId + i) % this.totalQuestions) + 1;
            questionIds.push(questionId);
        }
        
        return questionIds;
    }

    // Получает общее количество доступных билетов
    async getTicketsCount() {
        // Рассчитываем количество билетов: 1130 вопросов / 10 вопросов на билет = 113 билетов
        const ticketsCount = Math.floor(this.totalQuestions / this.questionsPerTicket);
        console.log(`📊 TicketLoader: Доступно билетов: ${ticketsCount}`);
        return ticketsCount;
    }

    // Получает общее количество доступных вопросов
    async getQuestionsCount() {
        console.log(`📊 TicketLoader: Всего вопросов: ${this.totalQuestions}`);
        return this.totalQuestions;
    }

    // Загружает случайные вопросы для тестирования через API
    async loadRandomQuestions(count = 20) {
        try {
            const currentLang = localStorage.getItem('selectedLanguage') || 'uz';
            const response = await fetch(`${this.apiBaseUrl}/random/${count}?lang=${currentLang}`);
            
            if (!response.ok) {
                throw new Error('Failed to load random questions');
            }
            
            const data = await response.json();
            return data.questions;
        } catch (error) {
            console.error('Error loading random questions:', error);
            return [];
        }
    }

    // Обновляет статистику вопроса после ответа
    async updateQuestionStats(questionId, correct, timeSeconds) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/stats/${questionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ correct, timeSeconds })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update question stats');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating question stats:', error);
            return null;
        }
    }

    // Очищает кеш
    clearCache() {
        this.cache.clear();
    }

    // Предзагружает данные для лучшей производительности
    async preloadTicket(ticketNumber) {
        return this.loadTicket(ticketNumber);
    }
}

// Создаем глобальный экземпляр
const ticketLoader = new TicketLoader();

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ticketLoader;
} else {
    window.ticketLoader = ticketLoader;
}