// Вспомогательный класс для работы с вопросами в формате с translations
class QuestionHelper {
    constructor() {
        this.defaultLanguage = 'uz';
    }

    // Получает текущий выбранный язык
    getCurrentLanguage() {
        return localStorage.getItem('selectedLanguage') || this.defaultLanguage;
    }

    // Извлекает данные вопроса для конкретного языка
    getQuestionData(question, language = null) {
        const lang = language || this.getCurrentLanguage();
        
        if (!question || !question.translations) {
            console.error('Неверный формат вопроса:', question);
            return null;
        }

        // Пробуем получить данные для запрошенного языка
        if (question.translations[lang]) {
            return {
                questionId: question.questionId,
                image: question.image,
                ...question.translations[lang]
            };
        }

        // Fallback на узбекский
        if (question.translations[this.defaultLanguage]) {
            console.warn(`Язык ${lang} не найден, используем ${this.defaultLanguage}`);
            return {
                questionId: question.questionId,
                image: question.image,
                ...question.translations[this.defaultLanguage]
            };
        }

        // Fallback на первый доступный язык
        const availableLanguages = Object.keys(question.translations);
        if (availableLanguages.length > 0) {
            const firstLang = availableLanguages[0];
            console.warn(`Используем первый доступный язык: ${firstLang}`);
            return {
                questionId: question.questionId,
                image: question.image,
                ...question.translations[firstLang]
            };
        }

        return null;
    }

    // Получает доступные языки для вопроса
    getAvailableLanguages(question) {
        if (!question || !question.translations) {
            return [];
        }
        return Object.keys(question.translations);
    }

    // Проверяет доступность языка для вопроса
    isLanguageAvailable(question, language) {
        return question && 
               question.translations && 
               question.translations[language] !== undefined;
    }

    // Форматирует вопрос для отображения
    formatQuestionForDisplay(question, language = null) {
        const data = this.getQuestionData(question, language);
        
        if (!data) {
            return null;
        }

        return {
            id: data.questionId,
            text: data.text,
            options: data.options || [],
            correctAnswerIndex: data.correctAnswer,
            correctAnswerText: data.options ? data.options[data.correctAnswer - 1] : '',
            explanation: data.explanation || '',
            image: data.image || null,
            hasImage: data.image && data.image !== 'data/images/defaultpic.jpg'
        };
    }

    // Создает HTML разметку для вопроса
    createQuestionHTML(question, language = null, options = {}) {
        const formatted = this.formatQuestionForDisplay(question, language);
        
        if (!formatted) {
            return '<div class="error">Ошибка загрузки вопроса</div>';
        }

        const showCorrectAnswer = options.showCorrectAnswer !== false;
        const showExplanation = options.showExplanation !== false;

        let html = `
            <div class="question-card" data-question-id="${formatted.id}">
                <div class="question-header">
                    <h3 class="question-title">Вопрос #${formatted.id}</h3>
                </div>
                
                <div class="question-text">
                    <p>${formatted.text}</p>
                </div>
        `;

        // Изображение
        if (formatted.hasImage) {
            html += `
                <div class="question-image-container">
                    <img src="${formatted.image}" 
                         class="question-image" 
                         alt="Изображение к вопросу ${formatted.id}"
                         loading="lazy">
                </div>
            `;
        }

        // Варианты ответов
        html += '<div class="question-options">';
        formatted.options.forEach((option, index) => {
            const isCorrect = (index + 1) === formatted.correctAnswerIndex;
            const correctClass = showCorrectAnswer && isCorrect ? 'correct' : '';
            const correctMark = showCorrectAnswer && isCorrect ? ' <span class="check-mark">✓</span>' : '';
            
            html += `
                <div class="option ${correctClass}" data-option-index="${index + 1}">
                    <span class="option-text">${option}</span>${correctMark}
                </div>
            `;
        });
        html += '</div>';

        // Объяснение
        if (showExplanation && formatted.explanation) {
            html += `
                <div class="question-explanation">
                    <strong>Объяснение:</strong>
                    <p>${formatted.explanation}</p>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    // Валидирует структуру вопроса
    validateQuestion(question) {
        const errors = [];

        if (!question) {
            errors.push('Вопрос не определен');
            return errors;
        }

        if (!question.questionId) {
            errors.push('Отсутствует questionId');
        }

        if (!question.translations) {
            errors.push('Отсутствует объект translations');
            return errors;
        }

        const languages = Object.keys(question.translations);
        if (languages.length === 0) {
            errors.push('Нет ни одного перевода');
        }

        // Проверяем каждый перевод
        languages.forEach(lang => {
            const data = question.translations[lang];
            
            if (!data.text) {
                errors.push(`[${lang}] Отсутствует текст вопроса`);
            }

            if (!Array.isArray(data.options) || data.options.length === 0) {
                errors.push(`[${lang}] Отсутствуют или пусты варианты ответов`);
            }

            if (!data.correctAnswer || data.correctAnswer < 1 || data.correctAnswer > data.options.length) {
                errors.push(`[${lang}] Некорректный индекс правильного ответа`);
            }
        });

        return errors;
    }
}

// Создаем глобальный экземпляр
const questionHelper = new QuestionHelper();

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestionHelper, questionHelper };
} else {
    window.QuestionHelper = QuestionHelper;
    window.questionHelper = questionHelper;
}
