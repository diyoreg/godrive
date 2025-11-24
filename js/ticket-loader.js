// Модуль для загрузки билетов и вопросов из файловой структуры
class TicketLoader {
    constructor() {
        this.questionsPath = 'data/questions/';
        this.ticketsPreviewPath = 'data/tickets_preview.js';
        this.cache = new Map();
        this.ticketsPreview = null;
        this.loadTicketsPreview();
    }

    // Загружает вопрос по ID
    async loadQuestion(questionId, language = null) {
        // Используем язык из параметра или из localStorage
        const currentLang = language || localStorage.getItem('selectedLanguage') || 'uz';
        const cacheKey = `question_${questionId}_${currentLang}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const paddedId = String(questionId).padStart(4, '0');
            const response = await fetch(`${this.questionsPath}q${paddedId}.json`);
            
            if (!response.ok) {
                throw new Error(`Question ${questionId} not found`);
            }
            
            const questionData = await response.json();
            
            // Возвращаем вопрос напрямую в новом формате
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

    // Загружает превью билетов
    async loadTicketsPreview() {
        if (this.ticketsPreview) return this.ticketsPreview;
        
        try {
            // Загружаем скрипт с билетами
            const script = document.createElement('script');
            script.src = this.ticketsPreviewPath;
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    this.ticketsPreview = window.ticketsPreview || [];
                    console.log(`📊 Загружено ${this.ticketsPreview.length} билетов`);
                    resolve(this.ticketsPreview);
                };
                script.onerror = () => {
                    reject(new Error('Failed to load tickets preview'));
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('Error loading tickets preview:', error);
            return [];
        }
    }

    // Загружает билет по номеру
    async loadTicket(ticketNumber) {
        const cacheKey = `ticket_${ticketNumber}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Убеждаемся, что превью билетов загружено
            await this.loadTicketsPreview();
            
            // Находим билет в превью
            const ticketData = this.ticketsPreview.find(t => t.ticketNumber === ticketNumber);
            
            if (!ticketData) {
                throw new Error(`Ticket ${ticketNumber} not found`);
            }
            
            // Загружаем все вопросы для билета
            const questions = [];
            for (const questionId of ticketData.questionIds) {
                const question = await this.loadQuestion(questionId);
                if (question) {
                    questions.push(question);
                }
            }
            
            const ticket = {
                ticketNumber: ticketData.ticketNumber,
                questions: questions
            };
            
            this.cache.set(cacheKey, ticket);
            return ticket;
        } catch (error) {
            console.error(`Error loading ticket ${ticketNumber}:`, error);
            return null;
        }
    }

    // Получает общее количество доступных билетов
    async getTicketsCount() {
        try {
            // Убеждаемся, что превью билетов загружено
            await this.loadTicketsPreview();
            
            const count = this.ticketsPreview ? this.ticketsPreview.length : 0;
            console.log(`📊 TicketLoader: Найдено билетов: ${count}`);
            return Math.max(count, 1); // минимум 1 билет
        } catch (error) {
            console.error('Error counting tickets:', error);
            return 118; // возвращаем ожидаемое количество билетов
        }
    }

    // Получает общее количество доступных вопросов
    async getQuestionsCount() {
        try {
            // Убеждаемся, что превью билетов загружено
            await this.loadTicketsPreview();
            
            // Подсчитываем максимальный ID вопроса из всех билетов
            let maxQuestionId = 0;
            if (this.ticketsPreview) {
                for (const ticket of this.ticketsPreview) {
                    for (const questionId of ticket.questionIds) {
                        if (questionId > maxQuestionId) {
                            maxQuestionId = questionId;
                        }
                    }
                }
            }
            
            console.log(`📊 TicketLoader: Найдено вопросов: ${maxQuestionId}`);
            return Math.max(maxQuestionId, 10); // минимум 10 вопросов
        } catch (error) {
            console.error('Error counting questions:', error);
            return 1180; // возвращаем ожидаемое количество вопросов (118 билетов × 10 вопросов)
        }
    }

    // Загружает случайные вопросы для тестирования
    async loadRandomQuestions(count = 20) {
        try {
            const totalQuestions = await this.getQuestionsCount();
            const randomIds = [];
            
            // Генерируем уникальные случайные ID
            while (randomIds.length < count && randomIds.length < totalQuestions) {
                const randomId = Math.floor(Math.random() * totalQuestions) + 1;
                if (!randomIds.includes(randomId)) {
                    randomIds.push(randomId);
                }
            }
            
            // Загружаем вопросы
            const questions = [];
            for (const questionId of randomIds) {
                const question = await this.loadQuestion(questionId);
                if (question) {
                    questions.push(question);
                }
            }
            
            return questions;
        } catch (error) {
            console.error('Error loading random questions:', error);
            return [];
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