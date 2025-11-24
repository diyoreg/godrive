// Превью билетов для экзамена по вождению в Узбекистане
// 118 билетов по 10 вопросов каждый (всего 1180 вопросов)

const ticketsPreview = [];

// Генерируем билеты от 1 до 118
for (let ticketNumber = 1; ticketNumber <= 118; ticketNumber++) {
    // Каждый билет содержит 10 последовательных вопросов
    const startQuestionId = (ticketNumber - 1) * 10 + 1;
    const questionIds = [];
    
    for (let i = 0; i < 10; i++) {
        questionIds.push(startQuestionId + i);
    }
    
    ticketsPreview.push({
        ticketNumber: ticketNumber,
        questionIds: questionIds
    });
}

// Примеры для проверки:
// Билет 1: вопросы 1-10
// Билет 2: вопросы 11-20  
// Билет 3: вопросы 21-30
// ...
// Билет 118: вопросы 1171-1180

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ticketsPreview;
} else {
    window.ticketsPreview = ticketsPreview;
}